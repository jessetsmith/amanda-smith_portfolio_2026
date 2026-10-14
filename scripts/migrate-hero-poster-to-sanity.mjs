/**
 * Upload the current local hero still to Sanity and attach it to homepageHero.
 * Usage: node scripts/migrate-hero-poster-to-sanity.mjs
 */
import { createClient } from "@sanity/client";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, basename } from "path";
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

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const LOCAL_STILL = resolve(
  root,
  "public/media/uploads/tu-e-io-handprint-still-be71dd34.jpg",
);

if (!existsSync(LOCAL_STILL)) {
  console.error("Missing local still:", LOCAL_STILL);
  process.exit(1);
}

const buffer = readFileSync(LOCAL_STILL);
const filename = basename(LOCAL_STILL);

console.log("Uploading", filename, "→ Sanity…");
const asset = await client.assets.upload("image", buffer, {
  filename,
  contentType: "image/jpeg",
});

console.log("asset", asset._id);
console.log("url host", (() => {
  try {
    return new URL(asset.url).host;
  } catch {
    return "(bad url)";
  }
})());

const existing = await client.fetch(
  `*[_type == "homepageHero" && _id == "homepageHero"][0]{
    titleText, supportText, videoUrl, watchUrl
  }`,
);

const titleText = existing?.titleText || "Amanda Smith";
const supportText =
  existing?.supportText ||
  "Exhibitions, research, and writing — arranged as one connected grid.";
const videoUrl = existing?.videoUrl || "https://youtu.be/onvmlLHEu_0";
const watchUrl = existing?.watchUrl || videoUrl;

const image = {
  _type: "image",
  asset: { _type: "reference", _ref: asset._id },
};

await client.createOrReplace({
  _id: "homepageHero",
  _type: "homepageHero",
  titleText,
  supportText,
  videoUrl,
  watchUrl,
  // Clear bad YouTube-as-posterUrl; assets are the source of truth.
  poster: image,
  backgroundImage: image,
});

await client
  .patch("homepage")
  .set({
    introMaskText: titleText,
    introSupport: supportText,
    introVideoUrl: videoUrl,
    introPosterUrl: asset.url,
  })
  .commit()
  .catch(() => undefined);

const verify = await client.fetch(`*[_id == "homepageHero"][0]{
  "posterUrl": poster.asset->url,
  "imageUrl": backgroundImage.asset->url,
  "posterAssetId": poster.asset->_id,
  videoUrl,
  watchUrl
}`);

console.log("verify", {
  posterHost: verify?.posterUrl ? new URL(verify.posterUrl).host : null,
  imageHost: verify?.imageUrl ? new URL(verify.imageUrl).host : null,
  posterAssetId: verify?.posterAssetId,
  hasVideo: Boolean(verify?.videoUrl),
});
console.log("done");
