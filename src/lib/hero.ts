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
  return {
    titleText,
    supportText,
    videoUrl: videoUrl || (imageUrl ? "" : fallback.videoUrl),
    ...(posterUrl ? { posterUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(watchUrl ? { watchUrl } : {}),
  };
}

export function heroSignature(hero: HomepageHero): string {
  return JSON.stringify(normalizeHero(hero));
}
