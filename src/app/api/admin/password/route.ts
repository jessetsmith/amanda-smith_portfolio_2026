import { NextResponse } from "next/server";
import {
  changeAdminPassword,
  isAdminAuthenticated,
  issueAdminSessionCookie,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  const confirmPassword = body.confirmPassword ?? "";

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation do not match" },
      { status: 400 },
    );
  }

  const result = await changeAdminPassword(currentPassword, newPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // The new hash invalidates all existing sessions; keep only this one signed in.
  const response = NextResponse.json({ ok: true });
  const cookie = await issueAdminSessionCookie(result.credentialMaterial);
  if (cookie) response.cookies.set(cookie);
  return response;
}
