/**
 * Signed admin session tokens. Web Crypto only, so this module runs in both
 * Edge middleware and Node route handlers — do not import Node or Next server APIs here.
 *
 * Token: `v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256 over "v1.<payload>")>`
 */
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-constants";

export type AdminSessionPayload = {
  /** Issued at (unix seconds). */
  iat: number;
  /** Expires at (unix seconds). */
  exp: number;
  nonce: string;
  /** Credential version: changes when the admin password changes. */
  cv: string;
};

const TOKEN_VERSION = "v1";
const MAX_TOKEN_LENGTH = 1024;
const CLOCK_SKEW_SECONDS = 60;
const MIN_SECRET_LENGTH = 32;
const KEY_DERIVATION_LABEL = "portfolio-admin-session/v1";
const DEV_FALLBACK_SECRET =
  "portfolio-admin-session-dev-only-secret-never-use-in-production";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const warned = new Set<string>();
function warnOnce(key: string, log: (msg: string) => void, msg: string) {
  if (warned.has(key)) return;
  warned.add(key);
  log(msg);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(input)) return null;
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Constant-time string comparison (length is not secret). */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Signing secret, in priority order:
 * 1. ADMIN_SESSION_SECRET (>= 32 chars) — preferred.
 * 2. Derived from SANITY_API_WRITE_TOKEN — server-only and already set on Vercel,
 *    so production keeps working without a new env var. Rotating that token logs
 *    admins out.
 * 3. Non-production only: a fixed dev secret, with a warning.
 * Otherwise null: production fails closed (no session can be issued or verified).
 */
function resolveSecretMaterial(): string | null {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit && explicit.length >= MIN_SECRET_LENGTH) {
    return `explicit:${explicit}`;
  }
  if (explicit) {
    warnOnce(
      "weak",
      console.error,
      `[admin-session] ADMIN_SESSION_SECRET is shorter than ${MIN_SECRET_LENGTH} characters and is ignored.`,
    );
  }

  const sanityWriteToken = process.env.SANITY_API_WRITE_TOKEN?.trim();
  if (sanityWriteToken) return `sanity-write-token:${sanityWriteToken}`;

  if (process.env.NODE_ENV !== "production") {
    warnOnce(
      "dev",
      console.warn,
      "[admin-session] No ADMIN_SESSION_SECRET or SANITY_API_WRITE_TOKEN set; using an insecure dev-only signing secret.",
    );
    return `dev:${DEV_FALLBACK_SECRET}`;
  }

  warnOnce(
    "missing",
    console.error,
    "[admin-session] ADMIN_SESSION_SECRET (or SANITY_API_WRITE_TOKEN) is not set in production; admin login is disabled. Set ADMIN_SESSION_SECRET in the Vercel project env.",
  );
  return null;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

async function deriveSigningKey(material: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(material),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const derived = await crypto.subtle.sign(
    "HMAC",
    baseKey,
    encoder.encode(KEY_DERIVATION_LABEL),
  );
  return crypto.subtle.importKey(
    "raw",
    derived,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function getSigningKey(): Promise<CryptoKey | null> {
  const material = resolveSecretMaterial();
  if (!material) return null;
  let key = keyCache.get(material);
  if (!key) {
    key = deriveSigningKey(material);
    keyCache.set(material, key);
  }
  return key;
}

export async function isAdminSessionConfigured(): Promise<boolean> {
  return (await getSigningKey()) !== null;
}

/**
 * Opaque credential version for the current admin credential (e.g. username + bcrypt hash).
 * Keyed with the signing secret so the value in the cookie reveals nothing about the password.
 */
export async function computeCredentialVersion(
  credentialMaterial: string,
): Promise<string | null> {
  const key = await getSigningKey();
  if (!key) return null;
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`credential-version|${credentialMaterial}`),
  );
  return base64UrlEncode(new Uint8Array(mac).slice(0, 16));
}

export async function createAdminSessionToken(
  credentialVersion: string,
  nowMs: number = Date.now(),
): Promise<string | null> {
  const key = await getSigningKey();
  if (!key) return null;
  const iat = Math.floor(nowMs / 1000);
  const payload: AdminSessionPayload = {
    iat,
    exp: iat + ADMIN_SESSION_MAX_AGE_SECONDS,
    nonce: base64UrlEncode(crypto.getRandomValues(new Uint8Array(16))),
    cv: credentialVersion,
  };
  const body = `${TOKEN_VERSION}.${base64UrlEncode(encoder.encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * Verify signature (constant-time via subtle.verify) and expiry.
 * Does NOT check the credential version — callers with Sanity access must do that.
 */
export async function verifyAdminSessionToken(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<AdminSessionPayload | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;

  const key = await getSigningKey();
  if (!key) return null;

  const signature = base64UrlDecode(parts[2]);
  const payloadBytes = base64UrlDecode(parts[1]);
  if (!signature || !payloadBytes) return null;

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) return null;

  let payload: Partial<AdminSessionPayload>;
  try {
    payload = JSON.parse(decoder.decode(payloadBytes));
  } catch {
    return null;
  }
  const { iat, exp, nonce, cv } = payload;
  if (
    typeof iat !== "number" ||
    typeof exp !== "number" ||
    typeof nonce !== "string" ||
    typeof cv !== "string"
  ) {
    return null;
  }

  const now = Math.floor(nowMs / 1000);
  if (exp <= now) return null;
  if (iat > now + CLOCK_SKEW_SECONDS) return null;
  if (exp - iat > ADMIN_SESSION_MAX_AGE_SECONDS) return null;

  return { iat, exp, nonce, cv };
}

export function adminSessionCookie(value: string, maxAge: number) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function clearedAdminSessionCookie() {
  return adminSessionCookie("", 0);
}
