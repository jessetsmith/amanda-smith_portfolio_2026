export interface HomepageHero {
  titleText: string;
  supportText: string;
  videoUrl: string;
  posterUrl?: string;
  imageUrl?: string;
}

export type HeroDataSource = "sanity" | "fixture";

export interface HomepageHeroResult {
  hero: HomepageHero;
  source: HeroDataSource;
}
