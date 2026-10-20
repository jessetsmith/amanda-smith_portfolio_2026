import translations from "@/data/i18n/translations.json";
import { mergeLocaleMaps, toLocaleMap, type LocaleString } from "@/lib/i18n/resolve";
import type { GridItem } from "@/types/grid";
import type { CvData, NavItem, SiteSettings } from "@/types/content";
import type { HomepageHero } from "@/types/hero";

const TEXT_FIELDS = [
  "label",
  "subcategory",
  "prose",
  "meta",
  "headline",
  "title",
  "subtitle",
  "excerpt",
  "summary",
  "caption",
  "description",
  "imageAlt",
] as const;

type OverlayMap = Record<string, Partial<Record<(typeof TEXT_FIELDS)[number], LocaleString>>>;

/** Merge authored locale overlays onto hero (fixture / pre-seed path). */
export function applyHeroOverlays(hero: HomepageHero): HomepageHero {
  const overlay = translations.hero as {
    titleText?: unknown;
    supportText?: unknown;
    stampHint?: unknown;
    subtext?: unknown;
  };
  return {
    ...hero,
    titleText: mergeLocaleMaps(hero.titleText, overlay.titleText),
    supportText: mergeLocaleMaps(hero.supportText, overlay.supportText),
    stampHint: mergeLocaleMaps(hero.stampHint, overlay.stampHint),
    subtext: mergeLocaleMaps(hero.subtext, overlay.subtext),
  };
}

export function applySiteOverlays(site: SiteSettings): SiteSettings {
  const overlay = translations.site;
  const navByHref = new Map(
    (overlay.nav || []).map((n) => [n.href, n.label] as const),
  );
  return {
    ...site,
    siteTitle: mergeLocaleMaps(site.siteTitle, overlay.siteTitle),
    contactNote: mergeLocaleMaps(site.contactNote, overlay.contactNote),
    nav: site.nav.map((item: NavItem) => ({
      ...item,
      label: mergeLocaleMaps(item.label, navByHref.get(item.href)),
    })),
  };
}

export function applyGridOverlays(items: GridItem[]): GridItem[] {
  const grid = translations.grid as OverlayMap;
  return items.map((item) => {
    const overlay = grid[item.id];
    if (!overlay) return item;
    const next = { ...item } as GridItem & Record<string, unknown>;
    const currentMap = item as unknown as Record<string, unknown>;
    for (const field of TEXT_FIELDS) {
      if (field in overlay || field in currentMap) {
        next[field] = mergeLocaleMaps(currentMap[field], overlay[field]);
      }
    }
    return next as GridItem;
  });
}

export function applyCvOverlays(cv: CvData): CvData {
  const overlay = translations.cv;
  return {
    ...cv,
    headline: mergeLocaleMaps(cv.headline, overlay.headline),
    location: mergeLocaleMaps(cv.location, overlay.location),
    relocationNote: mergeLocaleMaps(cv.relocationNote, overlay.relocationNote),
    summary: mergeLocaleMaps(cv.summary, overlay.summary),
    expertiseTags: cv.expertiseTags.map((t) => toLocaleMap(t)),
    expertiseHighlights: cv.expertiseHighlights.map((h) => ({
      text: toLocaleMap(h.text),
    })),
    experience: cv.experience.map((e) => ({
      ...e,
      title: toLocaleMap(e.title),
      location: e.location ? toLocaleMap(e.location) : undefined,
      summary: e.summary ? toLocaleMap(e.summary) : undefined,
    })),
    awards: cv.awards.map((a) => ({
      ...a,
      title: toLocaleMap(a.title),
    })),
    speaking: cv.speaking.map((s) => ({
      ...s,
      eventTitle: toLocaleMap(s.eventTitle),
    })),
    education: cv.education.map((e) => ({
      ...e,
      title: toLocaleMap(e.title),
    })),
    technicalSkills: cv.technicalSkills.map((t) => toLocaleMap(t)),
    languages: cv.languages.map((l) => ({
      language: toLocaleMap(l.language),
      level: toLocaleMap(l.level),
    })),
  };
}
