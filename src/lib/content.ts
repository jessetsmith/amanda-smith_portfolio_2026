import { filterPublicGridItems } from "@/lib/grid";
import { readGridItems } from "@/lib/grid-store";
import { loadGridItems, mapSanityGridItems } from "@/lib/grid-sync";
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
  const grid = await loadGridItems();
  const defaults: HomepageContent = {
    source: grid.source,
    maskText: "Amanda Smith",
    support:
      "Exhibitions, research, and writing — arranged as one connected grid.",
    videoSrc: "/media/intro.mp4",
    posterSrc: undefined,
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
    return {
      source: sanityGrid ? "sanity" : grid.source,
      maskText: data.introMaskText || defaults.maskText,
      support: data.introSupport || defaults.support,
      videoSrc: data.introVideoUrl || defaults.videoSrc,
      posterSrc: data.introPosterUrl || defaults.posterSrc,
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
