import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import {
  ADMIN_AUTH_DOC_ID,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
} from "@/lib/auth-constants";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";

export {
  ADMIN_AUTH_DOC_ID,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_VALUE,
} from "@/lib/auth-constants";

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
