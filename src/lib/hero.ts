import type { HomepageHero } from "@/types/hero";

const DEFAULT_HERO: HomepageHero = {
  titleText: "Amanda Smith",
  supportText:
    "Exhibitions, research, and writing — arranged as one connected grid.",
  videoUrl: "/media/intro.mp4",
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Prefer absolute http(s) URLs for production (Pages cannot serve /media/uploads). */
export function isAbsoluteHttpUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Client-safe defaults (mirrors src/data/homepage-hero.json). */
export function defaultHero(): HomepageHero {
  return { ...DEFAULT_HERO };
}

export function normalizeHero(
  raw: Partial<HomepageHero> | null | undefined,
): HomepageHero {
  const fallback = defaultHero();
  const titleText = str(raw?.titleText) || fallback.titleText;
  const supportText = str(raw?.supportText) || fallback.supportText;
  const videoUrl = str(raw?.videoUrl);
  const posterUrl = str(raw?.posterUrl);
  const imageUrl = str(raw?.imageUrl);
  const watchUrl = str(raw?.watchUrl);
  const posterAssetId = str(raw?.posterAssetId);
  const imageAssetId = str(raw?.imageAssetId);
  return {
    titleText,
    supportText,
    videoUrl: videoUrl || (imageUrl ? "" : fallback.videoUrl),
    ...(posterUrl ? { posterUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(posterAssetId ? { posterAssetId } : {}),
    ...(imageAssetId ? { imageAssetId } : {}),
    ...(watchUrl ? { watchUrl } : {}),
  };
}

export function heroSignature(hero: HomepageHero): string {
  return JSON.stringify(normalizeHero(hero));
}
