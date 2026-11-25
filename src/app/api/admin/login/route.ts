import { NextResponse } from "next/server";
import { issueAdminSessionCookie, verifyCredentials } from "@/lib/auth";
import {
  clientIp,
  loginRateLimiter,
  loginThrottleKeys,
} from "@/lib/login-rate-limit";
import { rejectCrossSite } from "@/lib/request-origin";

function tooManyAttempts(retryAfterMs: number) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const minutes = Math.ceil(seconds / 60);
  return NextResponse.json(
    {
      error: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}

export async function POST(request: Request) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  let body: { user?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const user = typeof body.user === "string" ? body.user : "";
  const password = typeof body.password === "string" ? body.password : "";

  const limiter = loginRateLimiter();
  const keys = loginThrottleKeys(clientIp(request), user);
  const retryAfterMs = await limiter.retryAfterMs(keys);
  if (retryAfterMs > 0) return tooManyAttempts(retryAfterMs);

  const result = await verifyCredentials(user, password);
  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Try again shortly." },
      { status: 503 },
    );
  }
  if (result.status === "invalid") {
    await limiter.recordFailure(keys);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookie = await issueAdminSessionCookie(result.credentialMaterial);
  if (!cookie) {
    return NextResponse.json(
      { error: "Admin sessions are not configured on the server" },
      { status: 503 },
    );
  }

  await limiter.recordSuccess(keys);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie);
  return response;
}
