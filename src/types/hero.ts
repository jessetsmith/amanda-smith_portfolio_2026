import type { LocaleString } from "@/lib/i18n/resolve";
import type { CellTextSize } from "@/types/grid";

/**
 * Shared px ladder for hero quote + title (smallest = 12).
 * Quote typically 12–24; display title often 48–144.
 */
export const HERO_TEXT_SIZES = [
  12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144,
] as const;

export type HeroTextSize = (typeof HERO_TEXT_SIZES)[number];

export interface HomepageHero {
  titleText: LocaleString;
  supportText: LocaleString;
  videoUrl: string;
  /** Resolved absolute poster URL (prefer Sanity CDN). */
  posterUrl?: string;
  /** Resolved absolute background / alternate poster URL. */
  imageUrl?: string;
  /** Sanity image asset id for poster (image-…). */
  posterAssetId?: string;
  /** Sanity image asset id for background (image-…). */
  imageAssetId?: string;
  /** External “watch full video” link shown on the cover when set. */
  watchUrl?: string;
  /**
   * Public hero hover tip before the first stamp (“click to leave your mark”).
   * Empty → client uses the default copy.
   */
  stampHint?: LocaleString;
  /** Outline/stroke color for the cover name. Empty → paper stroke default. */
  titleTextColor?: string;
  /** Cover name size in px (from HERO_TEXT_SIZES). Empty → responsive clamp. */
  titleTextSize?: HeroTextSize;
  /** Color for the quote above the name. Empty → ink. */
  supportTextColor?: string;
  /** Quote size in px (from HERO_TEXT_SIZES). Empty → ~1.05rem default. */
  supportTextSize?: HeroTextSize;
  /**
   * Tagline under the nav / above the grid (definition hotspots match phrases).
   * Blank allowed per locale. Unset → seeded from historical uiCopy.gridIntro.
   */
  subtext?: LocaleString;
  /** Optional CSS color for the grid intro subtext. Empty → ink/70 default. */
  subtextTextColor?: string;
  /** Optional size for the grid intro subtext. Empty/md → current default. */
  subtextTextSize?: CellTextSize;
}

export type HeroDataSource = "sanity" | "fixture";

export interface HomepageHeroResult {
  hero: HomepageHero;
  source: HeroDataSource;
}
