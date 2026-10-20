import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import {
  resolveLocale,
  toLocaleMap,
  type LocaleString,
} from "@/lib/i18n/resolve";
import { UI_COPY } from "@/lib/i18n/ui-copy";
import { CELL_TEXT_SIZES, type CellTextSize } from "@/types/grid";
import type { HomepageHero } from "@/types/hero";

export const DEFAULT_STAMP_HINT = "click to leave your mark";

const DEFAULT_HERO: HomepageHero = {
  titleText: { en: "Amanda Smith" },
  supportText: {
    en: "Exhibitions, research, and writing — arranged as one connected grid.",
  },
  videoUrl: "/media/intro.mp4",
  stampHint: { en: DEFAULT_STAMP_HINT },
  subtext: { ...UI_COPY.gridIntro },
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseTextSize(value: unknown): CellTextSize | undefined {
  if (
    value === "sm" ||
    value === "md" ||
    value === "lg" ||
    value === "xl"
  ) {
    return value;
  }
  if (typeof value === "string" && CELL_TEXT_SIZES.includes(value as CellTextSize)) {
    return value as CellTextSize;
  }
  return undefined;
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
  return {
    ...DEFAULT_HERO,
    titleText: toLocaleMap(DEFAULT_HERO.titleText),
    supportText: toLocaleMap(DEFAULT_HERO.supportText),
    stampHint: toLocaleMap(DEFAULT_HERO.stampHint),
    subtext: toLocaleMap(DEFAULT_HERO.subtext ?? UI_COPY.gridIntro),
  };
}

export function normalizeHero(
  raw: Partial<HomepageHero> | null | undefined,
): HomepageHero {
  const fallback = defaultHero();
  const titleText = toLocaleMap(raw?.titleText, resolveLocale(fallback.titleText));
  const supportText = toLocaleMap(
    raw?.supportText,
    resolveLocale(fallback.supportText),
  );
  const videoUrl = str(raw?.videoUrl);
  const posterUrl = str(raw?.posterUrl);
  const imageUrl = str(raw?.imageUrl);
  const watchUrl = str(raw?.watchUrl);
  const stampHint = toLocaleMap(raw?.stampHint);
  const posterAssetId = str(raw?.posterAssetId);
  const imageAssetId = str(raw?.imageAssetId);

  // Unset subtext → historical gridIntro defaults. Explicit map (incl. blanks) kept.
  const hasSubtext =
    raw != null &&
    Object.prototype.hasOwnProperty.call(raw, "subtext") &&
    raw.subtext != null;
  const subtext = hasSubtext
    ? toLocaleMap(raw.subtext)
    : toLocaleMap(fallback.subtext);

  const subtextTextColor = str(raw?.subtextTextColor);
  const subtextTextSize = parseTextSize(raw?.subtextTextSize);

  return {
    titleText,
    supportText,
    videoUrl: videoUrl || (imageUrl ? "" : fallback.videoUrl),
    ...(posterUrl ? { posterUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(posterAssetId ? { posterAssetId } : {}),
    ...(imageAssetId ? { imageAssetId } : {}),
    ...(watchUrl ? { watchUrl } : {}),
    ...(Object.keys(stampHint).length ? { stampHint } : {}),
    subtext,
    ...(subtextTextColor ? { subtextTextColor } : {}),
    ...(subtextTextSize && subtextTextSize !== "md"
      ? { subtextTextSize }
      : {}),
  };
}

/** Resolved tip copy for the public hero (never empty). */
export function resolveStampHint(
  hero: Partial<HomepageHero> | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  const tip = resolveLocale(hero?.stampHint as LocaleString | undefined, locale);
  return tip || DEFAULT_STAMP_HINT;
}

export function heroSignature(hero: HomepageHero): string {
  return JSON.stringify(normalizeHero(hero));
}
