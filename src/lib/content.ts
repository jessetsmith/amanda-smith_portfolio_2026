import { filterPublicGridItems } from "@/lib/grid";
import { readGridItems } from "@/lib/grid-store";
import { loadGridItems, mapSanityGridItems } from "@/lib/grid-sync";
import { defaultHero } from "@/lib/hero";
import { loadHero } from "@/lib/hero-sync";
import { client } from "@/sanity/lib/client";
import { isSanityConfigured } from "@/sanity/env";
import {
  cvQuery,
  homepageQuery,
  siteSettingsQuery,
} from "@/sanity/lib/queries";
import cvFixture from "@/data/cv.json";
import siteFixture from "@/data/site-settings.json";
import type { CvData, HomepageContent, NavItem, SiteSettings } from "@/types/content";

export async function getHomepageContent(): Promise<HomepageContent> {
  const [grid, heroResult] = await Promise.all([loadGridItems(), loadHero()]);
  const hero = heroResult.hero;
  const defaults: HomepageContent = {
    source: grid.source,
    maskText: hero.titleText || defaultHero().titleText,
    support: hero.supportText || defaultHero().supportText,
    videoSrc: hero.videoUrl || defaultHero().videoUrl,
    posterSrc: hero.posterUrl || hero.imageUrl || undefined,
    imageSrc: hero.imageUrl || undefined,
    watchUrl: hero.watchUrl || undefined,
    gridItems: filterPublicGridItems(grid.items),
  };

  if (!isSanityConfigured() || !client) {
    return {
      ...defaults,
      source: "fixture",
      gridItems: filterPublicGridItems(await readGridItems()),
    };
  }

  try {
    // Tagged + revalidate:0 so Save → revalidateTag('homepage') refreshes public `/`
    const data = await client.fetch(
      homepageQuery,
      {},
      { next: { tags: ["homepage"], revalidate: 0 } },
    );
    if (!data) return defaults;
    const sanityGrid = mapSanityGridItems(data.gridItems);
    // Prefer dedicated homepageHero; fall back to legacy homepage intro fields
    const maskText =
      heroResult.source === "sanity"
        ? hero.titleText
        : data.introMaskText || hero.titleText || defaults.maskText;
    const support =
      heroResult.source === "sanity"
        ? hero.supportText
        : data.introSupport || hero.supportText || defaults.support;
    const videoSrc =
      heroResult.source === "sanity"
        ? hero.videoUrl || defaults.videoSrc
        : data.introVideoUrl || hero.videoUrl || defaults.videoSrc;
    const posterSrc =
      heroResult.source === "sanity"
        ? hero.posterUrl || hero.imageUrl || undefined
        : data.introPosterUrl || hero.posterUrl || hero.imageUrl || undefined;
    return {
      source: sanityGrid || heroResult.source === "sanity" ? "sanity" : grid.source,
      maskText: maskText || defaults.maskText,
      support: support || defaults.support,
      videoSrc: videoSrc || defaults.videoSrc,
      posterSrc,
      imageSrc: hero.imageUrl || undefined,
      watchUrl: hero.watchUrl || undefined,
      gridItems: filterPublicGridItems(sanityGrid ?? grid.items),
    };
  } catch {
    return defaults;
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const fixture = siteFixture as SiteSettings;
  if (!isSanityConfigured() || !client) {
    return { ...fixture, source: "fixture" };
  }
  try {
    const data = await client.fetch(siteSettingsQuery);
    if (!data) return { ...fixture, source: "fixture" };
    return {
      source: "sanity",
      siteTitle: data.siteTitle || fixture.siteTitle,
      nav: (data.nav as NavItem[])?.length ? data.nav : fixture.nav,
      contactEmail: data.contactEmail || fixture.contactEmail,
      contactNote: data.contactNote || fixture.contactNote,
    };
  } catch {
    return { ...fixture, source: "fixture" };
  }
}

export async function getCvData(): Promise<CvData> {
  const fixture = cvFixture as CvData;
  if (!isSanityConfigured() || !client) {
    return { ...fixture, source: "fixture" };
  }
  try {
    const data = await client.fetch(cvQuery);
    if (!data) return { ...fixture, source: "fixture" };
    return { ...fixture, ...data, source: "sanity" };
  } catch {
    return { ...fixture, source: "fixture" };
  }
}
