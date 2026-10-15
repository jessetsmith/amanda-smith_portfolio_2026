import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import seed from "@/data/homepage-hero.json";
import {
  defaultHero,
  isAbsoluteHttpUrl,
  normalizeHero,
} from "@/lib/hero";
import { resolveLocale, toLocaleMap } from "@/lib/i18n/resolve";
import { sanityFetchOptions } from "@/lib/sanity-fetch";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";
import { isSanityConfigured } from "@/sanity/env";
import { homepageHeroQuery, homepageQuery } from "@/sanity/lib/queries";
import type { HomepageHero, HomepageHeroResult } from "@/types/hero";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "homepage-hero.json");

const HERO_FETCH = sanityFetchOptions;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Local /media/uploads paths are fine in `next dev`, but GitHub Pages cannot
 * serve gitignored uploads — drop relative upload paths on static export.
 */
function publicMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (isAbsoluteHttpUrl(url)) return url;
  if (process.env.GITHUB_PAGES === "1") {
    if (url.startsWith("/media/uploads/")) return undefined;
  }
  return url;
}

function seedHero(): HomepageHero {
  return normalizeHero({
    titleText: toLocaleMap(seed.titleText, resolveLocale(defaultHero().titleText)),
    supportText: toLocaleMap(
      seed.supportText,
      resolveLocale(defaultHero().supportText),
    ),
    videoUrl: str(seed.videoUrl) || defaultHero().videoUrl,
    posterUrl: str(seed.posterUrl) || undefined,
    imageUrl: str(seed.imageUrl) || undefined,
    watchUrl: str(seed.watchUrl) || undefined,
    stampHint: toLocaleMap((seed as { stampHint?: string }).stampHint) || undefined,
  });
}

async function readLocalHero(): Promise<HomepageHero> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalizeHero(JSON.parse(raw) as Partial<HomepageHero>);
  } catch {
    return seedHero();
  }
}

async function writeLocalHero(hero: HomepageHero): Promise<HomepageHero> {
  const normalized = normalizeHero(hero);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function fromLegacyHomepage(data: {
  introMaskText?: string;
  introSupport?: string;
  introVideoUrl?: string;
  introPosterUrl?: string;
} | null): HomepageHero | null {
  if (!data) return null;
  const titleText = str(data.introMaskText);
  const supportText = str(data.introSupport);
  const videoUrl = str(data.introVideoUrl);
  const posterUrl = str(data.introPosterUrl);
  if (!titleText && !videoUrl && !supportText) return null;
  return normalizeHero({
    titleText: titleText || undefined,
    supportText: supportText || undefined,
    videoUrl: videoUrl || undefined,
    posterUrl: posterUrl || undefined,
  });
}

function fromSanityDoc(data: Partial<HomepageHero> | null): HomepageHero | null {
  if (!data) return null;
  if (!data.titleText && !data.videoUrl && !data.imageUrl && !data.posterUrl) {
    return null;
  }
  return normalizeHero({
    ...data,
    posterUrl: publicMediaUrl(str(data.posterUrl) || undefined),
    imageUrl: publicMediaUrl(str(data.imageUrl) || undefined),
  });
}

function imageRef(assetId: string | undefined) {
  if (!assetId) return undefined;
  return {
    _type: "image" as const,
    asset: { _type: "reference" as const, _ref: assetId },
  };
}

function heroDocumentFields(hero: HomepageHero) {
  const poster = imageRef(hero.posterAssetId);
  const backgroundImage = imageRef(hero.imageAssetId);
  return {
    titleText: hero.titleText,
    supportText: hero.supportText,
    videoUrl: hero.videoUrl || undefined,
    watchUrl: hero.watchUrl || undefined,
    stampHint: hero.stampHint || undefined,
    // Absolute URLs only in string overrides — local upload paths stay off Sanity.
    posterUrl: isAbsoluteHttpUrl(hero.posterUrl) ? hero.posterUrl : undefined,
    imageUrl: isAbsoluteHttpUrl(hero.imageUrl) ? hero.imageUrl : undefined,
    ...(poster ? { poster } : {}),
    ...(backgroundImage ? { backgroundImage } : {}),
  };
}

/** Ensure singleton exists in Sanity (seed from legacy homepage fields or defaults). */
export async function ensureHeroDocument(): Promise<HomepageHeroResult | null> {
  const writeClient = getWriteClient();
  if (!writeClient || !client) return null;

  const existing = await writeClient.fetch<{ _id?: string } | null>(
    `*[_type == "homepageHero" && _id == "homepageHero"][0]{_id}`,
  );
  if (existing?._id) {
    const data = await client.fetch(homepageHeroQuery, {}, HERO_FETCH);
    const hero = fromSanityDoc(data);
    return hero ? { hero, source: "sanity" } : null;
  }

  const legacy = await client.fetch(homepageQuery, {}, HERO_FETCH);
  const seeded = fromLegacyHomepage(legacy) ?? seedHero();
  await writeClient.createOrReplace({
    _id: "homepageHero",
    _type: "homepageHero",
    ...heroDocumentFields(seeded),
  });
  await writeClient
    .patch("homepage")
    .set({
      introMaskText: resolveLocale(seeded.titleText),
      introSupport: resolveLocale(seeded.supportText),
      introVideoUrl: seeded.videoUrl || undefined,
      introPosterUrl: isAbsoluteHttpUrl(seeded.posterUrl)
        ? seeded.posterUrl
        : undefined,
    })
    .commit()
    .catch(() => undefined);
  return { hero: seeded, source: "sanity" };
}

export async function loadHero(): Promise<HomepageHeroResult> {
  if (isSanityConfigured() && client) {
    try {
      const data = await client.fetch(homepageHeroQuery, {}, HERO_FETCH);
      const fromDoc = fromSanityDoc(data);
      if (fromDoc) return { hero: fromDoc, source: "sanity" };

      const ensured = await ensureHeroDocument();
      if (ensured) return ensured;

      const legacy = await client.fetch(homepageQuery, {}, HERO_FETCH);
      const fromLegacy = fromLegacyHomepage(legacy);
      if (fromLegacy) return { hero: fromLegacy, source: "sanity" };
    } catch {
      // fall through
    }
  }
  return { hero: await readLocalHero(), source: "fixture" };
}

export async function saveHero(hero: HomepageHero): Promise<HomepageHeroResult> {
  const normalized = normalizeHero(hero);
  const writeClient = getWriteClient();

  if (writeClient) {
    try {
      const fields = heroDocumentFields(normalized);
      // Full replace — omit poster/backgroundImage when no asset id (clears stale assets).
      await writeClient.createOrReplace({
        _id: "homepageHero",
        _type: "homepageHero",
        ...fields,
      });

      await writeClient
        .patch("homepage")
        .set({
          introMaskText: resolveLocale(normalized.titleText),
          introSupport: resolveLocale(normalized.supportText),
          introVideoUrl: normalized.videoUrl || undefined,
          introPosterUrl: isAbsoluteHttpUrl(normalized.posterUrl)
            ? normalized.posterUrl
            : isAbsoluteHttpUrl(normalized.imageUrl)
              ? normalized.imageUrl
              : undefined,
        })
        .commit()
        .catch(() => undefined);

      await writeLocalHero(normalized).catch(() => undefined);
      const refreshed = await loadHero();
      if (refreshed.source === "sanity") return refreshed;
      return { hero: normalized, source: "sanity" };
    } catch (err) {
      console.error("Sanity hero save failed, falling back to .data", err);
    }
  }

  const local = await writeLocalHero(normalized);
  return { hero: local, source: "fixture" };
}

export { defaultHero, normalizeHero, heroSignature } from "@/lib/hero";
