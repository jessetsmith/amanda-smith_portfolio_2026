#!/usr/bin/env node
/**
 * One-time (or rotate) seed for the adminAuth singleton in Sanity.
 * Stores username + bcrypt hash only — prints plaintext password once to stdout.
 *
 * Usage (rotate / seed — writes bcrypt hash only, never stores plaintext):
 *   npm run sanity:seed-admin
 *   ADMIN_SEED_USER=amanda ADMIN_SEED_PASSWORD='your-new-password' npm run sanity:seed-admin
 *
 * Prefer the in-app “Change password” control while logged into /admin when you
 * know the current password. This CLI path is for rotation without a session.
 *
 * Requires SANITY_API_WRITE_TOKEN (or READ with write grants) + NEXT_PUBLIC_SANITY_*.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";
import bcrypt from "bcryptjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
const token =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;

if (!projectId || projectId === "placeholder-project") {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID");
  process.exit(1);
}
if (!token) {
  console.error("Missing SANITY_API_WRITE_TOKEN (or SANITY_API_READ_TOKEN)");
  process.exit(1);
}

const username = (process.env.ADMIN_SEED_USER || "admin").trim();
const password =
  process.env.ADMIN_SEED_PASSWORD ||
  randomBytes(18).toString("base64url");

const rounds = 12;
const passwordHash = await bcrypt.hash(password, rounds);
const fingerprint = createHash("sha256")
  .update(passwordHash)
  .digest("hex")
  .slice(0, 12);

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const docId = "adminAuth";
const nowNote = new Date().toISOString();

await client.createOrReplace({
  _id: docId,
  _type: "adminAuth",
  username,
  passwordHash,
  updatedAtNote: nowNote,
});

console.log("Seeded Sanity adminAuth singleton.");
console.log(`  document: ${docId}`);
console.log(`  project:  ${projectId} / ${dataset}`);
console.log(`  username: ${username}`);
console.log(`  password: ${password}`);
console.log(`  hash fp:  ${fingerprint} (sha256 of bcrypt, for log correlation)`);
console.log("");
console.log("Store the password somewhere safe — it is not saved in plaintext.");
console.log("Rotate later with: ADMIN_SEED_PASSWORD='...' npm run sanity:seed-admin");
