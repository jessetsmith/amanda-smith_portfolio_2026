import { NextResponse } from "next/server";
import { clearedAdminSessionCookie } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearedAdminSessionCookie());
  return response;
}
