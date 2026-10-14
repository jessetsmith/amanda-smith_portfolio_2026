export interface HomepageHero {
  titleText: string;
  supportText: string;
  videoUrl: string;
  posterUrl?: string;
  imageUrl?: string;
  /** External “watch full video” link shown on the cover when set. */
  watchUrl?: string;
}

export type HeroDataSource = "sanity" | "fixture";

export interface HomepageHeroResult {
  hero: HomepageHero;
  source: HeroDataSource;
}
