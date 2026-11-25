import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth-constants";
import {
  clearedAdminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

/**
 * Fast gate for /admin pages: signature + expiry only. The credential-version
 * check (password changes) needs Sanity and runs server-side in isAdminAuthenticated().
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSessionToken(token))) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    const response = NextResponse.redirect(login);
    if (token !== undefined) response.cookies.set(clearedAdminSessionCookie());
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
