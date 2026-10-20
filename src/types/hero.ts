import type { LocaleString } from "@/lib/i18n/resolve";
import type { CellTextSize } from "@/types/grid";

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
