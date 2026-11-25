import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import {
  ADMIN_AUTH_DOC_ID,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-constants";
import {
  adminSessionCookie,
  computeCredentialVersion,
  constantTimeEqual,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";

export {
  ADMIN_AUTH_DOC_ID,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE,
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

function sanityCredentialMaterial(username: string, passwordHash: string): string {
  return `sanity:${username}:${passwordHash}`;
}

function envBootstrapCredential(): { user: string; password: string } | null {
  const envUser = process.env.ADMIN_USER?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envUser || envPassword === undefined || envPassword === "") return null;
  return { user: envUser, password: envPassword };
}

/**
 * Identifies the credential a session was issued for. Sessions are bound to it,
 * so a password change (new bcrypt hash) invalidates every existing session.
 */
async function currentCredentialMaterial(): Promise<string | null> {
  const doc = await fetchAdminAuthDoc();
  if (doc?.username && doc.passwordHash) {
    return sanityCredentialMaterial(doc.username, doc.passwordHash);
  }
  const env = envBootstrapCredential();
  return env ? `env:${env.user}:${env.password}` : null;
}

/**
 * Verify /admin login against Sanity-stored bcrypt hash.
 * Falls back to ADMIN_USER / ADMIN_PASSWORD env only when the Sanity doc is missing.
 * Returns the credential material to bind the new session to, or null.
 */
export async function verifyCredentials(
  user: string,
  password: string,
): Promise<string | null> {
  const trimmedUser = user.trim();
  if (!trimmedUser || !password) return null;

  const doc = await fetchAdminAuthDoc();
  if (doc?.username && doc.passwordHash) {
    if (trimmedUser !== doc.username) return null;
    try {
      return (await compare(password, doc.passwordHash))
        ? sanityCredentialMaterial(doc.username, doc.passwordHash)
        : null;
    } catch {
      return null;
    }
  }

  // Bootstrap / emergency only — not the primary production path.
  const env = envBootstrapCredential();
  if (
    env &&
    constantTimeEqual(trimmedUser, env.user) &&
    constantTimeEqual(password, env.password)
  ) {
    return `env:${env.user}:${env.password}`;
  }
  return null;
}

/** Cookie to set for a new session bound to `credentialMaterial`, or null if sessions are not configured. */
export async function issueAdminSessionCookie(credentialMaterial: string) {
  const credentialVersion = await computeCredentialVersion(credentialMaterial);
  if (!credentialVersion) return null;
  const token = await createAdminSessionToken(credentialVersion);
  if (!token) return null;
  return adminSessionCookie(token, ADMIN_SESSION_MAX_AGE_SECONDS);
}

/**
 * Full server-side session check: signature, expiry, and that the session was
 * issued for the current admin credential. Every admin write must call this.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const payload = await verifyAdminSessionToken(
    jar.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!payload) return false;

  const material = await currentCredentialMaterial();
  if (!material) return false;
  const expected = await computeCredentialVersion(material);
  return expected !== null && constantTimeEqual(payload.cv, expected);
}

export type ChangePasswordResult =
  | { ok: true; credentialMaterial: string }
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

  return {
    ok: true,
    credentialMaterial: sanityCredentialMaterial(doc.username, passwordHash),
  };
}
