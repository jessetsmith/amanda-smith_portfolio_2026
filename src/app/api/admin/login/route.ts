import { NextResponse } from "next/server";
import { issueAdminSessionCookie, verifyCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { user?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const user = body.user ?? "";
  const password = body.password ?? "";

  const credentialMaterial = await verifyCredentials(user, password);
  if (!credentialMaterial) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookie = await issueAdminSessionCookie(credentialMaterial);
  if (!cookie) {
    return NextResponse.json(
      { error: "Admin sessions are not configured on the server" },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie);
  return response;
}
