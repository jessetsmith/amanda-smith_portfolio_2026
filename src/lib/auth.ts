import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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
  isAdminSessionConfigured,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { rejectCrossSite } from "@/lib/request-origin";
import { getWriteClient } from "@/sanity/lib/write-client";

export {
  ADMIN_AUTH_DOC_ID,
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE,
} from "@/lib/auth-constants";

const BCRYPT_ROUNDS = 12;

/** Compared against when the username is wrong, so unknown users cost the same bcrypt time. */
const DUMMY_BCRYPT_HASH =
  "$2b$12$YrywdDNjRds.qmsCdtanYuHOiOqV/Lw4Q.bbXLpkKyY.SDo8Egbpa";

type AdminAuthDoc = {
  username?: string;
  passwordHash?: string;
};

type AdminAuthLookup =
  | { status: "found"; username: string; passwordHash: string }
  /** Sanity answered and has no adminAuth document (first-time setup). */
  | { status: "missing" }
  /** No token-bearing Sanity client (Sanity not configured). */
  | { status: "unconfigured" }
  /** Sanity request failed or the document is incomplete. */
  | { status: "error" };

const ADMIN_AUTH_QUERY = `*[_type == "adminAuth" && _id == $id][0]{
  username,
  passwordHash
}`;

/**
 * Load admin auth from Sanity with a server token (never CDN / never public GROQ).
 * A tokenless client is not trusted: on a private dataset it would read "missing".
 */
async function lookupAdminAuth(): Promise<AdminAuthLookup> {
  const serverClient = getWriteClient();
  if (!serverClient) return { status: "unconfigured" };
  let doc: AdminAuthDoc | null;
  try {
    doc = await serverClient.fetch<AdminAuthDoc | null>(
      ADMIN_AUTH_QUERY,
      { id: ADMIN_AUTH_DOC_ID },
      { cache: "no-store" },
    );
  } catch (err) {
    console.error("[auth] Failed to read adminAuth from Sanity", err);
    return { status: "error" };
  }
  if (!doc) return { status: "missing" };
  if (!doc.username || !doc.passwordHash) {
    console.error("[auth] adminAuth document is missing username or passwordHash");
    return { status: "error" };
  }
  return { status: "found", username: doc.username, passwordHash: doc.passwordHash };
}

function sanityCredentialMaterial(username: string, passwordHash: string): string {
  return `sanity:${username}:${passwordHash}`;
}

/**
 * ADMIN_USER / ADMIN_PASSWORD, only when Sanity confirmed there is no adminAuth
 * document, or in local dev without Sanity. Never on a Sanity error.
 */
function envBootstrapCredential(
  lookup: AdminAuthLookup,
): { user: string; password: string } | null {
  const allowed =
    lookup.status === "missing" ||
    (lookup.status === "unconfigured" && process.env.NODE_ENV !== "production");
  if (!allowed) return null;
  const envUser = process.env.ADMIN_USER?.trim();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envUser || envPassword === undefined || envPassword === "") return null;
  return { user: envUser, password: envPassword };
}

type CredentialMaterialResult =
  | { status: "ok"; material: string }
  | { status: "missing" }
  | { status: "unavailable"; reason: string };

/**
 * Identifies the credential a session was issued for. Sessions are bound to it,
 * so a password change (new bcrypt hash) invalidates every existing session.
 */
async function currentCredentialMaterial(): Promise<CredentialMaterialResult> {
  const lookup = await lookupAdminAuth();
  if (lookup.status === "found") {
    return {
      status: "ok",
      material: sanityCredentialMaterial(lookup.username, lookup.passwordHash),
    };
  }
  const env = envBootstrapCredential(lookup);
  if (env) {
    return { status: "ok", material: `env:${env.user}:${env.password}` };
  }
  if (lookup.status === "missing") {
    return { status: "missing" };
  }
  return {
    status: "unavailable",
    reason:
      lookup.status === "unconfigured"
        ? "Sanity credentials are not configured on the server"
        : "Could not verify admin session with Sanity",
  };
}

export type CredentialCheck =
  | { status: "ok"; credentialMaterial: string }
  | { status: "invalid" }
  /** Credentials could not be checked (Sanity error / not configured in production). */
  | { status: "unavailable" };

/**
 * Verify /admin login against Sanity-stored bcrypt hash. Falls back to the
 * ADMIN_USER / ADMIN_PASSWORD bootstrap only per envBootstrapCredential.
 */
export async function verifyCredentials(
  user: string,
  password: string,
): Promise<CredentialCheck> {
  const trimmedUser = user.trim();
  const lookup = await lookupAdminAuth();

  if (lookup.status === "found") {
    const userMatches = trimmedUser === lookup.username;
    let passwordMatches = false;
    try {
      passwordMatches = await compare(
        password,
        userMatches ? lookup.passwordHash : DUMMY_BCRYPT_HASH,
      );
    } catch {
      passwordMatches = false;
    }
    return userMatches && passwordMatches
      ? {
          status: "ok",
          credentialMaterial: sanityCredentialMaterial(
            lookup.username,
            lookup.passwordHash,
          ),
        }
      : { status: "invalid" };
  }

  const env = envBootstrapCredential(lookup);
  if (!env) {
    return lookup.status === "missing" ? { status: "invalid" } : { status: "unavailable" };
  }
  if (
    trimmedUser &&
    password &&
    constantTimeEqual(trimmedUser, env.user) &&
    constantTimeEqual(password, env.password)
  ) {
    return { status: "ok", credentialMaterial: `env:${env.user}:${env.password}` };
  }
  return { status: "invalid" };
}

/** Cookie to set for a new session bound to `credentialMaterial`, or null if sessions are not configured. */
export async function issueAdminSessionCookie(credentialMaterial: string) {
  const credentialVersion = await computeCredentialVersion(credentialMaterial);
  if (!credentialVersion) return null;
  const token = await createAdminSessionToken(credentialVersion);
  if (!token) return null;
  return adminSessionCookie(token, ADMIN_SESSION_MAX_AGE_SECONDS);
}

export type AdminSessionCheck =
  | { status: "ok" }
  | { status: "unauthenticated" }
  | { status: "unavailable"; reason: string };

export async function checkAdminSession(): Promise<AdminSessionCheck> {
  if (!(await isAdminSessionConfigured())) {
    return {
      status: "unavailable",
      reason: "Admin sessions are not configured on the server",
    };
  }
  const jar = await cookies();
  const payload = await verifyAdminSessionToken(
    jar.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!payload) return { status: "unauthenticated" };

  const current = await currentCredentialMaterial();
  if (current.status === "unavailable") {
    return { status: "unavailable", reason: current.reason };
  }
  if (current.status !== "ok") return { status: "unauthenticated" };

  const expected = await computeCredentialVersion(current.material);
  if (expected === null) {
    return {
      status: "unavailable",
      reason: "Admin sessions are not configured on the server",
    };
  }
  return constantTimeEqual(payload.cv, expected)
    ? { status: "ok" }
    : { status: "unauthenticated" };
}

/**
 * Full server-side session check: signature, expiry, and that the session was
 * issued for the current admin credential. Every admin write must call this.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const check = await checkAdminSession();
  return check.status === "ok";
}

/**
 * Guard for every state-changing admin route: same-site Origin/Referer, then a
 * valid session. Returns the error response to send, or null to proceed.
 */
export async function requireAdminWrite(request: Request): Promise<Response | null> {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;
  const session = await checkAdminSession();
  if (session.status === "unavailable") {
    return NextResponse.json({ error: session.reason }, { status: 503 });
  }
  if (session.status !== "ok") {
    return NextResponse.json(
      { error: "Session expired — please sign in again." },
      { status: 401 },
    );
  }
  return null;
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

  const doc = await lookupAdminAuth();
  if (doc.status !== "found") {
    return doc.status === "missing"
      ? {
          ok: false,
          error:
            "Admin auth is not seeded in Sanity. Run npm run sanity:seed-admin first.",
          status: 400,
        }
      : { ok: false, error: "Could not read admin auth from Sanity", status: 503 };
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
