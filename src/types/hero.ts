export interface HomepageHero {
  titleText: string;
  supportText: string;
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
  stampHint?: string;
}

export type HeroDataSource = "sanity" | "fixture";

export interface HomepageHeroResult {
  hero: HomepageHero;
  source: HeroDataSource;
}
