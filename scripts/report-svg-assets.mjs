#!/usr/bin/env node
/**
 * Read-only report of SVG content: Sanity SVG assets (and which documents use
 * them), document fields that point at .svg URLs, and SVG files in the local
 * upload folder. Deletes nothing.
 *
 * Usage: npm run sanity:report-svg
 * Requires NEXT_PUBLIC_SANITY_PROJECT_ID + SANITY_API_READ_TOKEN (or WRITE).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

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
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
const token =
  process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN;

const uploadsDir = join(root, "public", "media", "uploads");
const localSvgs = existsSync(uploadsDir)
  ? readdirSync(uploadsDir).filter((name) => {
      if (name.toLowerCase().endsWith(".svg")) return true;
      const head = readFileSync(join(uploadsDir, name)).subarray(0, 512).toString("utf8");
      return /<svg[\s>]/i.test(head);
    })
  : [];
console.log(`Local public/media/uploads SVG files: ${localSvgs.length}`);
for (const name of localSvgs) console.log(`  - ${name}`);

if (!projectId || projectId === "placeholder-project" || !token) {
  console.error(
    "\nSkipping Sanity: set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_READ_TOKEN.",
  );
  process.exit(localSvgs.length ? 2 : 0);
}

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });

const assets = await client.fetch(
  `*[_type in ["sanity.imageAsset", "sanity.fileAsset"] &&
     (extension == "svg" || mimeType == "image/svg+xml")]{
    _id, originalFilename, url, size, _createdAt,
    "usedBy": *[references(^._id)]{_id, _type}
  } | order(_createdAt asc)`,
);
console.log(`\nSanity SVG assets: ${assets.length}`);
for (const asset of assets) {
  const usedBy = asset.usedBy.map((doc) => `${doc._type}:${doc._id}`).join(", ") || "unused";
  console.log(`  - ${asset.originalFilename ?? "(no name)"} ${asset.url}`);
  console.log(`    id=${asset._id} created=${asset._createdAt} usedBy=${usedBy}`);
}

const docs = await client.fetch(
  `*[!(_type match "sanity.*") && !(_type in ["adminAuth", "adminLoginThrottle"])]`,
);
const svgRefs = [];
function scan(value, pathParts, doc) {
  if (typeof value === "string") {
    if (/\.svg(\?|#|$)/i.test(value.trim())) {
      svgRefs.push(`${doc._type}:${doc._id} ${pathParts.join(".")} = ${value}`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => scan(item, [...pathParts, `[${i}]`], doc));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) scan(child, [...pathParts, key], doc);
  }
}
for (const doc of docs) scan(doc, [], doc);
console.log(`\nDocument fields pointing at .svg URLs: ${svgRefs.length}`);
for (const ref of svgRefs) console.log(`  - ${ref}`);

process.exit(localSvgs.length || assets.length || svgRefs.length ? 2 : 0);
