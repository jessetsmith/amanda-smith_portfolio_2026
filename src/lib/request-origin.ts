import { NextResponse } from "next/server";

/** Production hosts that may submit admin requests in addition to the request's own host. */
const ALLOWED_HOSTS = new Set([
  "portfolio.bittersweetwoman.com",
  "amanda-smith-portfolio-2026.vercel.app",
]);

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Vercel system env vars for the current deployment (bare hosts, no scheme). */
function vercelHosts(): string[] {
  return [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .map((host) => host?.trim().toLowerCase())
    .filter((host): host is string => Boolean(host));
}

/** Host the request was addressed to (Vercel sets x-forwarded-host). */
function requestHost(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0] ??
    request.headers.get("host");
  return host ? host.trim().toLowerCase() : null;
}

function sourceOrigin(request: Request): URL | null {
  const origin = request.headers.get("origin");
  if (origin === "null") return null;
  const candidate = origin ?? request.headers.get("referer");
  if (!candidate) return null;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

/**
 * True when the browser says the request came from this site: Origin (or Referer
 * when Origin is absent) must be the request's own host, a known production host,
 * this Vercel deployment's host, or localhost outside production.
 */
export function isSameSiteRequest(request: Request): boolean {
  const source = sourceOrigin(request);
  if (!source) return false;

  const host = source.host.toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";

  if (LOCAL_HOSTNAMES.has(source.hostname.toLowerCase())) {
    return !isProduction || host === requestHost(request);
  }
  if (source.protocol !== "https:" && isProduction) return false;

  return (
    host === requestHost(request) ||
    ALLOWED_HOSTS.has(host) ||
    vercelHosts().includes(host)
  );
}

/** 403 response for cross-site state-changing requests, or null when allowed. */
export function rejectCrossSite(request: Request): NextResponse | null {
  if (isSameSiteRequest(request)) return null;
  return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
}
