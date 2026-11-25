import { NextResponse } from "next/server";
import { clearedAdminSessionCookie } from "@/lib/admin-session";
import { rejectCrossSite } from "@/lib/request-origin";

export async function POST(request: Request) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearedAdminSessionCookie());
  return response;
}
