import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import seed from "@/data/homepage-hero.json";
import { defaultHero, normalizeHero } from "@/lib/hero";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";
import { isSanityConfigured } from "@/sanity/env";
import { homepageHeroQuery, homepageQuery } from "@/sanity/lib/queries";
import type { HomepageHero, HomepageHeroResult } from "@/types/hero";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "homepage-hero.json");

const HERO_FETCH = {
  next: { tags: ["homepage"], revalidate: 0 as const },
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function seedHero(): HomepageHero {
  return normalizeHero({
    titleText: str(seed.titleText) || defaultHero().titleText,
    supportText: str(seed.supportText) || defaultHero().supportText,
    videoUrl: str(seed.videoUrl) || defaultHero().videoUrl,
    posterUrl: str(seed.posterUrl) || undefined,
    imageUrl: str(seed.imageUrl) || undefined,
    watchUrl: str(seed.watchUrl) || undefined,
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

/** Ensure singleton exists in Sanity (seed from legacy homepage fields or defaults). */
export async function ensureHeroDocument(): Promise<HomepageHeroResult | null> {
  const writeClient = getWriteClient();
  if (!writeClient || !client) return null;

  const existing = await writeClient.fetch<{ _id?: string } | null>(
    `*[_type == "homepageHero" && _id == "homepageHero"][0]{_id}`,
  );
  if (existing?._id) {
    const data = await client.fetch(homepageHeroQuery, {}, HERO_FETCH);
    return { hero: normalizeHero(data), source: "sanity" };
  }

  const legacy = await client.fetch(homepageQuery, {}, HERO_FETCH);
  const seeded = fromLegacyHomepage(legacy) ?? seedHero();
  await writeClient.createOrReplace({
    _id: "homepageHero",
    _type: "homepageHero",
    ...seeded,
  });
  await writeClient
    .patch("homepage")
    .set({
      introMaskText: seeded.titleText,
      introSupport: seeded.supportText,
      introVideoUrl: seeded.videoUrl || undefined,
      introPosterUrl: seeded.posterUrl || undefined,
    })
    .commit()
    .catch(() => undefined);
  return { hero: seeded, source: "sanity" };
}

export async function loadHero(): Promise<HomepageHeroResult> {
  if (isSanityConfigured() && client) {
    try {
      const data = await client.fetch(homepageHeroQuery, {}, HERO_FETCH);
      if (data?.titleText || data?.videoUrl) {
        return { hero: normalizeHero(data), source: "sanity" };
      }
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
      await writeClient.createOrReplace({
        _id: "homepageHero",
        _type: "homepageHero",
        ...normalized,
      });
      await writeClient
        .patch("homepage")
        .set({
          introMaskText: normalized.titleText,
          introSupport: normalized.supportText,
          introVideoUrl: normalized.videoUrl || undefined,
          introPosterUrl: normalized.posterUrl || undefined,
        })
        .commit()
        .catch(() => undefined);

      await writeLocalHero(normalized).catch(() => undefined);
      return { hero: normalized, source: "sanity" };
    } catch (err) {
      console.error("Sanity hero save failed, falling back to .data", err);
    }
  }

  const local = await writeLocalHero(normalized);
  return { hero: local, source: "fixture" };
}

export { defaultHero, normalizeHero, heroSignature } from "@/lib/hero";
