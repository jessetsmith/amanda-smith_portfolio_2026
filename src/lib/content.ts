import { filterPublicGridItems } from "@/lib/grid";
import { readGridItems } from "@/lib/grid-store";
import {
  loadGridItems,
  localizeFixtureGridItems,
  mapSanityGridItems,
} from "@/lib/grid-sync";
import { defaultHero } from "@/lib/hero";
import { loadHero } from "@/lib/hero-sync";
import { normalizeSiteSettings } from "@/lib/site";
import {
  applyCvOverlays,
  applyGridOverlays,
  applyHeroOverlays,
  applySiteOverlays,
} from "@/lib/i18n/apply-overlays";
import {
  resolveLocale,
  toLocaleMap,
  type LocaleString,
} from "@/lib/i18n/resolve";
import {
  defaultUiCopyDoc,
  mergeUiCopyDoc,
  type UiCopyDoc,
} from "@/lib/i18n/ui-copy";
import { sanityFetchOptions } from "@/lib/sanity-fetch";
import { client } from "@/sanity/lib/client";
import { isSanityConfigured } from "@/sanity/env";
import {
  cvQuery,
  homepageQuery,
  siteSettingsQuery,
  uiCopyQuery,
} from "@/sanity/lib/queries";
import cvFixture from "@/data/cv.json";
import siteFixture from "@/data/site-settings.json";
import type {
  CvData,
  CvHighlight,
  HomepageContent,
  NavItem,
  SiteSettings,
} from "@/types/content";

function loc(value: unknown, fallback = ""): LocaleString {
  return toLocaleMap(value, fallback);
}

function locOpt(value: unknown): LocaleString | undefined {
  const map = toLocaleMap(value);
  return Object.keys(map).length ? map : undefined;
}

function localizeNav(nav: unknown): NavItem[] {
  if (!Array.isArray(nav)) return [];
  return nav
    .map((item) => {
      const row = item as { label?: unknown; href?: unknown };
      const href = typeof row.href === "string" ? row.href : "";
      if (!href) return null;
      return { label: loc(row.label, "Link"), href };
    })
    .filter(Boolean) as NavItem[];
}

async function loadUiCopy(): Promise<UiCopyDoc> {
  if (!isSanityConfigured() || !client) return defaultUiCopyDoc();
  try {
    const data = await client.fetch(uiCopyQuery, {}, sanityFetchOptions);
    return mergeUiCopyDoc(data);
  } catch {
    return defaultUiCopyDoc();
  }
}

export async function getHomepageContent(): Promise<HomepageContent> {
  const [grid, heroResult, uiCopy] = await Promise.all([
    loadGridItems(),
    loadHero(),
    loadUiCopy(),
  ]);
  const hero =
    heroResult.source === "fixture"
      ? applyHeroOverlays(heroResult.hero)
      : heroResult.hero;
  const heroFallback = defaultHero();
  const gridItemsBase =
    grid.source === "fixture" ? applyGridOverlays(grid.items) : grid.items;
  const defaults: HomepageContent = {
    source: grid.source,
    maskText: loc(hero.titleText, resolveLocale(heroFallback.titleText)),
    support: loc(hero.supportText, resolveLocale(heroFallback.supportText)),
    videoSrc: hero.videoUrl || heroFallback.videoUrl,
    posterSrc: hero.posterUrl || hero.imageUrl || undefined,
    imageSrc: hero.imageUrl || undefined,
    watchUrl: hero.watchUrl || undefined,
    stampHint: locOpt(hero.stampHint),
    subtext: loc(hero.subtext),
    subtextTextColor: hero.subtextTextColor,
    subtextTextSize: hero.subtextTextSize,
    gridItems: filterPublicGridItems(gridItemsBase),
    uiCopy,
  };

  if (!isSanityConfigured() || !client) {
    return {
      ...defaults,
      source: "fixture",
      gridItems: filterPublicGridItems(
        applyGridOverlays(localizeFixtureGridItems(await readGridItems())),
      ),
    };
  }

  try {
    const data = await client.fetch(homepageQuery, {}, sanityFetchOptions);
    if (!data) return defaults;
    const sanityGrid = mapSanityGridItems(data.gridItems);
    const maskText =
      heroResult.source === "sanity"
        ? loc(hero.titleText)
        : loc(
            data.introMaskText || hero.titleText,
            resolveLocale(defaults.maskText),
          );
    const support =
      heroResult.source === "sanity"
        ? loc(hero.supportText)
        : loc(
            data.introSupport || hero.supportText,
            resolveLocale(defaults.support),
          );
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
      maskText: Object.keys(toLocaleMap(maskText)).length
        ? loc(maskText)
        : defaults.maskText,
      support: Object.keys(toLocaleMap(support)).length
        ? loc(support)
        : defaults.support,
      videoSrc: videoSrc || defaults.videoSrc,
      posterSrc,
      imageSrc: hero.imageUrl || undefined,
      watchUrl: hero.watchUrl || undefined,
      stampHint: locOpt(hero.stampHint),
      subtext: loc(hero.subtext),
      subtextTextColor: hero.subtextTextColor,
      subtextTextSize: hero.subtextTextSize,
      gridItems: filterPublicGridItems(sanityGrid ?? grid.items),
      uiCopy,
    };
  } catch {
    return defaults;
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const fixture = siteFixture as {
    siteTitle: string;
    nav: { label: string; href: string }[];
    contactEmail?: string;
    contactNote?: string;
  };
  const fixtureSettings = applySiteOverlays(
    normalizeSiteSettings(
      {
        siteTitle: fixture.siteTitle,
        nav: localizeNav(fixture.nav),
        contactEmail: fixture.contactEmail,
        contactNote: fixture.contactNote,
      },
      "fixture",
    ),
  );

  if (!isSanityConfigured() || !client) {
    return fixtureSettings;
  }
  try {
    const data = await client.fetch(siteSettingsQuery);
    if (!data) return fixtureSettings;
    return normalizeSiteSettings(
      {
        siteTitle: data.siteTitle,
        nav: data.nav,
        navTextColor: data.navTextColor,
        navTextSize: data.navTextSize,
        contactEmail: data.contactEmail,
        contactNote: data.contactNote,
      },
      "sanity",
    );
  } catch {
    return fixtureSettings;
  }
}

function localizeCv(raw: Record<string, unknown>, source: "fixture" | "sanity"): CvData {
  const expertiseTags = Array.isArray(raw.expertiseTags)
    ? raw.expertiseTags.map((t) => loc(t))
    : [];
  const expertiseHighlights: CvHighlight[] = Array.isArray(raw.expertiseHighlights)
    ? raw.expertiseHighlights.map((h) => ({
        text: loc((h as { text?: unknown }).text),
      }))
    : [];

  return {
    source,
    name: typeof raw.name === "string" ? raw.name : "",
    headline: loc(raw.headline),
    phone: typeof raw.phone === "string" ? raw.phone : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    location: locOpt(raw.location),
    relocationNote: locOpt(raw.relocationNote),
    summary: locOpt(raw.summary),
    expertiseTags,
    expertiseHighlights,
    experience: Array.isArray(raw.experience)
      ? raw.experience.map((e) => {
          const row = e as Record<string, unknown>;
          return {
            title: loc(row.title),
            org: typeof row.org === "string" ? row.org : "",
            location: locOpt(row.location),
            startDate: typeof row.startDate === "string" ? row.startDate : undefined,
            endDate: typeof row.endDate === "string" ? row.endDate : undefined,
            current: Boolean(row.current),
            summary: locOpt(row.summary),
            bullets: Array.isArray(row.bullets)
              ? row.bullets.map((b) => loc(b))
              : undefined,
          };
        })
      : [],
    awards: Array.isArray(raw.awards)
      ? raw.awards.map((a) => {
          const row = a as Record<string, unknown>;
          return {
            title: loc(row.title),
            org: typeof row.org === "string" ? row.org : "",
            location: locOpt(row.location),
            date: typeof row.date === "string" ? row.date : undefined,
            description: locOpt(row.description),
          };
        })
      : [],
    speaking: Array.isArray(raw.speaking)
      ? raw.speaking.map((s) => {
          const row = s as Record<string, unknown>;
          return {
            role: typeof row.role === "string" ? row.role : undefined,
            eventTitle: loc(row.eventTitle),
            org: typeof row.org === "string" ? row.org : undefined,
            location: locOpt(row.location),
            date: typeof row.date === "string" ? row.date : undefined,
            description: locOpt(row.description),
          };
        })
      : [],
    education: Array.isArray(raw.education)
      ? raw.education.map((e) => {
          const row = e as Record<string, unknown>;
          return {
            credentialType:
              typeof row.credentialType === "string"
                ? row.credentialType
                : undefined,
            title: loc(row.title),
            institution: typeof row.institution === "string" ? row.institution : "",
            location: locOpt(row.location),
            startYear: typeof row.startYear === "string" ? row.startYear : undefined,
            endYear: typeof row.endYear === "string" ? row.endYear : undefined,
            notes: locOpt(row.notes),
          };
        })
      : [],
    technicalSkills: Array.isArray(raw.technicalSkills)
      ? raw.technicalSkills.map((t) => loc(t))
      : [],
    languages: Array.isArray(raw.languages)
      ? raw.languages.map((l) => {
          const row = l as Record<string, unknown>;
          return {
            language: loc(row.language),
            level: loc(row.level),
          };
        })
      : [],
    publications: Array.isArray(raw.publications)
      ? raw.publications.map((p) => {
          const row = p as Record<string, unknown>;
          return {
            title: typeof row.title === "string" ? row.title : "",
            venue: typeof row.venue === "string" ? row.venue : undefined,
            date: typeof row.date === "string" ? row.date : undefined,
            url: typeof row.url === "string" ? row.url : undefined,
          };
        })
      : [],
  };
}

export async function getCvData(): Promise<CvData> {
  const fixture = applyCvOverlays(
    localizeCv(cvFixture as unknown as Record<string, unknown>, "fixture"),
  );
  const uiCopy = await loadUiCopy();
  if (!isSanityConfigured() || !client) {
    return { ...fixture, uiCopy };
  }
  try {
    const data = await client.fetch(cvQuery);
    if (!data) return { ...fixture, uiCopy };
    return {
      ...localizeCv({ ...fixture, ...data } as Record<string, unknown>, "sanity"),
      uiCopy,
    };
  } catch {
    return { ...fixture, uiCopy };
  }
}
