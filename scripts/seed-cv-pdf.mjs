/**
 * Upload CV_RESUME_EDITED_2026.pdf to Sanity and attach it to the cv singleton.
 * Prefers store/public copies; falls back to the other path if one is missing.
 *
 * Usage: node scripts/seed-cv-pdf.mjs
 */
import { createClient } from "@sanity/client";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) throw new Error(".env.local missing");
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token =
  process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";

if (!projectId || !token) {
  console.error("Missing projectId or token");
  process.exit(1);
}

const FILENAME = "CV_RESUME_EDITED_2026.pdf";
const publicPdf = resolve(root, "public/media/cv", FILENAME);
const storePdf = resolve(
  process.env.HOME || "",
  "Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-84a7cd34-4a75-4961-865c-1c889fcc4fe9/files/media/cv",
  FILENAME,
);

const source = existsSync(publicPdf)
  ? publicPdf
  : existsSync(storePdf)
    ? storePdf
    : null;

if (!source) {
  console.error("Missing PDF. Expected one of:\n ", publicPdf, "\n ", storePdf);
  process.exit(1);
}

if (source !== publicPdf) {
  mkdirSync(dirname(publicPdf), { recursive: true });
  copyFileSync(source, publicPdf);
  console.log("Copied PDF →", publicPdf);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const buffer = readFileSync(source);
console.log("Uploading", basename(source), `(${buffer.length} bytes) → Sanity…`);

const asset = await client.assets.upload("file", buffer, {
  filename: FILENAME,
  contentType: "application/pdf",
});

console.log("asset", asset._id);
console.log("url", asset.url);

await client
  .transaction()
  .createIfNotExists({ _id: "cv", _type: "cv", name: "Amanda Smith" })
  .patch("cv", {
    set: {
      cvPdf: {
        _type: "file",
        asset: {
          _type: "reference",
          _ref: asset._id,
        },
      },
    },
  })
  .commit();

console.log("Attached cvPdf on document cv");
console.log("Done.");
