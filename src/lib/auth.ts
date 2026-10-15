import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import {
  ADMIN_AUTH_DOC_ID,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
} from "@/lib/auth-constants";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";

export {
  ADMIN_AUTH_DOC_ID,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
} from "@/lib/auth-constants";

const BCRYPT_ROUNDS = 12;

type AdminAuthDoc = {
  username?: string;
  passwordHash?: string;
};

const ADMIN_AUTH_QUERY = `*[_type == "adminAuth" && _id == $id][0]{
  username,
  passwordHash
}`;

/**
 * Load admin auth from Sanity with a server token (never CDN / never public GROQ).
 */
async function fetchAdminAuthDoc(): Promise<AdminAuthDoc | null> {
  const serverClient = getWriteClient() ?? client;
  if (!serverClient) return null;
  try {
    return await serverClient.fetch<AdminAuthDoc | null>(ADMIN_AUTH_QUERY, {
      id: ADMIN_AUTH_DOC_ID,
    });
  } catch {
    return null;
  }
}

/** Emergency bootstrap only — used when Sanity has no adminAuth doc yet. */
function envBootstrapMatch(user: string, password: string): boolean {
  const envUser = process.env.ADMIN_USER?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envUser || envPassword === undefined || envPassword === "") return false;
  return user === envUser && password === envPassword;
}

/**
 * Verify /admin login against Sanity-stored bcrypt hash.
 * Falls back to ADMIN_USER / ADMIN_PASSWORD env only when the Sanity doc is missing.
 */
export async function verifyCredentials(
  user: string,
  password: string,
): Promise<boolean> {
  const trimmedUser = user.trim();
  if (!trimmedUser || !password) return false;

  const doc = await fetchAdminAuthDoc();
  if (doc?.username && doc.passwordHash) {
    if (trimmedUser !== doc.username) return false;
    try {
      return await compare(password, doc.passwordHash);
    } catch {
      return false;
    }
  }

  // Bootstrap / emergency only — not the primary production path.
  return envBootstrapMatch(trimmedUser, password);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_SESSION_COOKIE)?.value === ADMIN_SESSION_VALUE;
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * Verify current password against Sanity hash, then store a new bcrypt hash.
 * Never persists plaintext. Requires an existing adminAuth document (use seed script first).
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  if (!currentPassword || !newPassword) {
    return { ok: false, error: "Current and new password are required", status: 400 };
  }
  if (newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `New password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`,
      status: 400,
    };
  }
  if (currentPassword === newPassword) {
    return {
      ok: false,
      error: "New password must be different from the current password",
      status: 400,
    };
  }

  const writeClient = getWriteClient();
  if (!writeClient) {
    return {
      ok: false,
      error: "Sanity write client unavailable",
      status: 503,
    };
  }

  const doc = await fetchAdminAuthDoc();
  if (!doc?.username || !doc.passwordHash) {
    return {
      ok: false,
      error:
        "Admin auth is not seeded in Sanity. Run npm run sanity:seed-admin first.",
      status: 400,
    };
  }

  let currentOk = false;
  try {
    currentOk = await compare(currentPassword, doc.passwordHash);
  } catch {
    currentOk = false;
  }
  if (!currentOk) {
    return { ok: false, error: "Current password is incorrect", status: 401 };
  }

  const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
  try {
    await writeClient
      .patch(ADMIN_AUTH_DOC_ID)
      .set({
        passwordHash,
        updatedAtNote: new Date().toISOString(),
      })
      .commit();
  } catch {
    return { ok: false, error: "Failed to update password in Sanity", status: 502 };
  }

  return { ok: true };
}
