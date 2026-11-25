/** Production hosts that may submit admin requests in addition to the request's own host. */
const ALLOWED_HOSTS = new Set([
  "portfolio.bittersweetwoman.com",
  "www.portfolio.bittersweetwoman.com",
  "amanda-smith-portfolio-2026.vercel.app",
]);

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Normalize a host header or Vercel env value into a lowercase `host[:port]`
 * with default ports (:443 for https, :80 for http) stripped so it matches
 * `URL.prototype.host`.
 */
function normalizeHost(
  raw: string | null | undefined,
  protocol: string = "https:",
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const withScheme = trimmed.includes("://")
      ? trimmed
      : `${protocol}//${trimmed.split("/")[0]}`;
    return new URL(withScheme).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Vercel system env vars for the current deployment. */
function vercelHosts(): string[] {
  return [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .map((host) => normalizeHost(host, "https:"))
    .filter((host): host is string => Boolean(host));
}

/** All normalized hosts the request was addressed to (proxy + direct host headers). */
function requestHosts(request: Request, protocol: string): Set<string> {
  const hosts = new Set<string>();
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    for (const part of forwarded.split(",")) {
      const normalized = normalizeHost(part, protocol);
      if (normalized) hosts.add(normalized);
    }
  }
  const direct = normalizeHost(request.headers.get("host"), protocol);
  if (direct) hosts.add(direct);
  return hosts;
}

type SourceOriginResult =
  | { kind: "url"; url: URL }
  | { kind: "absent" }
  | { kind: "invalid" };

function sourceOrigin(request: Request): SourceOriginResult {
  const rawOrigin = request.headers.get("origin");
  const origin = rawOrigin?.trim() ?? "";
  if (origin === "null") return { kind: "invalid" };

  const referer = request.headers.get("referer")?.trim() ?? "";
  const candidate = origin || referer;
  if (!candidate) return { kind: "absent" };

  try {
    return { kind: "url", url: new URL(candidate) };
  } catch {
    return { kind: "invalid" };
  }
}

/**
 * True when the browser says the request came from this site: Origin (or Referer
 * when Origin is absent/empty) must be the request's own host, a known production
 * host, this Vercel deployment's host, or localhost outside production. When both
 * Origin and Referer are stripped by a privacy proxy/browser, falls back to the
 * browser-enforced `Sec-Fetch-Site: same-origin` header.
 */
export function isSameSiteRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite === "cross-site") return false;

  const source = sourceOrigin(request);
  if (source.kind === "invalid") return false;
  if (source.kind === "absent") {
    return fetchSite === "same-origin";
  }

  const host = source.url.host.toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";
  const reqHosts = requestHosts(request, source.url.protocol);

  if (LOCAL_HOSTNAMES.has(source.url.hostname.toLowerCase())) {
    return !isProduction || reqHosts.has(host);
  }
  if (source.url.protocol !== "https:" && isProduction) return false;

  return (
    reqHosts.has(host) ||
    ALLOWED_HOSTS.has(host) ||
    vercelHosts().includes(host)
  );
}

/** 403 response for cross-site state-changing requests, or null when allowed. */
export function rejectCrossSite(request: Request): Response | null {
  if (isSameSiteRequest(request)) return null;
  return Response.json({ error: "Cross-site request blocked" }, { status: 403 });
}
