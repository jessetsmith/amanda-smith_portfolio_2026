import { readGridItems } from "@/lib/grid-store";
import type { GridItem } from "@/types/grid";
import { normalizeGridItems } from "@/lib/grid-normalize";
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

function mapSanityGridItems(raw: unknown): GridItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const mapped = raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    const projectRef = row.projectRef as
      | { title?: string; summary?: string; year?: string }
      | undefined;
    const kind = String(row.kind || "textCell");
    const base = {
      id: String(row.id || `sanity-${index + 1}`),
      order: Number(row.order ?? index + 1),
      colStart: Number(row.colStart ?? 1),
      colSpan: Number(row.colSpan ?? 1),
      rowSpan: Number(row.rowSpan ?? 1),
      fill: row.fill as GridItem["fill"],
    };

    if (kind === "projectCell") {
      return {
        ...base,
        kind: "projectCell" as const,
        title: String(row.title || projectRef?.title || "Untitled"),
        year: (row.year as string) || projectRef?.year,
        summary: (row.summary as string) || projectRef?.summary,
      };
    }
    if (kind === "titleRow") {
      return {
        ...base,
        kind: "titleRow" as const,
        label: String(row.label || "Section"),
      };
    }
    if (kind === "colorCell") {
      return {
        ...base,
        kind: "colorCell" as const,
        fill: (row.fill as GridItem["fill"]) || "rust",
        label: row.label as string | undefined,
      };
    }
    if (kind === "mediaCell") {
      return {
        ...base,
        kind: "mediaCell" as const,
        caption: (row.caption as string) || "Media",
        placeholderTone:
          (row.placeholderTone as "warm" | "cool" | "ink") || "warm",
      };
    }
    return {
      ...base,
      kind: "textCell" as const,
      headline: String(row.headline || "Headline"),
      excerpt: row.excerpt as string | undefined,
      meta: row.meta as string | undefined,
    };
  });
  return normalizeGridItems(mapped as GridItem[]);
}

export async function getHomepageContent(): Promise<HomepageContent> {
  const fixtureGrid = await readGridItems();
  const defaults: HomepageContent = {
    source: "fixture",
    maskText: "Amanda Smith",
    support:
      "Exhibitions, research, and writing — arranged as one connected grid.",
    videoSrc: "/media/intro.mp4",
    posterSrc: undefined,
    gridItems: fixtureGrid,
  };

  if (!isSanityConfigured() || !client) {
    return defaults;
  }

  try {
    const data = await client.fetch(homepageQuery);
    if (!data) return defaults;
    const sanityGrid = mapSanityGridItems(data.gridItems);
    return {
      source: sanityGrid ? "sanity" : "fixture",
      maskText: data.introMaskText || defaults.maskText,
      support: data.introSupport || defaults.support,
      videoSrc: data.introVideoUrl || defaults.videoSrc,
      posterSrc: data.introPosterUrl || defaults.posterSrc,
      gridItems: sanityGrid ?? fixtureGrid,
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
