import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
  PLACEHOLDER_ADMIN_PASSWORD,
  PLACEHOLDER_ADMIN_USER,
} from "@/lib/auth-constants";

export {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
  PLACEHOLDER_ADMIN_PASSWORD,
  PLACEHOLDER_ADMIN_USER,
} from "@/lib/auth-constants";

export function getAdminCredentials() {
  return {
    user: process.env.ADMIN_USER ?? PLACEHOLDER_ADMIN_USER,
    password: process.env.ADMIN_PASSWORD ?? PLACEHOLDER_ADMIN_PASSWORD,
  };
}

export function verifyCredentials(user: string, password: string): boolean {
  const creds = getAdminCredentials();
  return user === creds.user && password === creds.password;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_SESSION_COOKIE)?.value === ADMIN_SESSION_VALUE;
}
