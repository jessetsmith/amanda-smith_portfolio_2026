import siteFixture from "@/data/site-settings.json";
import { toLocaleMap } from "@/lib/i18n/resolve";
import { CELL_TEXT_SIZES, type CellTextSize } from "@/types/grid";
import type { NavItem, SiteSettings } from "@/types/content";

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseTextSize(value: unknown): CellTextSize | undefined {
  if (
    typeof value === "string" &&
    CELL_TEXT_SIZES.includes(value as CellTextSize)
  ) {
    return value as CellTextSize;
  }
  return undefined;
}

function normalizeNav(raw: unknown): NavItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const item = row as { label?: unknown; href?: unknown };
      const href = str(item.href);
      if (!href) return null;
      return { label: toLocaleMap(item.label), href };
    })
    .filter(Boolean) as NavItem[];
}

/** Client-safe normalize (no Node fs / Sanity write client). */
export function normalizeSiteSettings(
  raw: Partial<SiteSettings> | null | undefined,
  source: SiteSettings["source"] = "fixture",
): SiteSettings {
  const fixture = siteFixture as {
    siteTitle: string;
    nav: { label: string; href: string }[];
    contactEmail?: string;
    contactNote?: string;
  };
  const nav = normalizeNav(raw?.nav);
  const fallbackNav = normalizeNav(fixture.nav);
  const navTextColor = str(raw?.navTextColor);
  const navTextSize = parseTextSize(raw?.navTextSize);
  return {
    source,
    siteTitle: toLocaleMap(raw?.siteTitle, fixture.siteTitle),
    nav: nav.length ? nav : fallbackNav,
    ...(navTextColor ? { navTextColor } : {}),
    ...(navTextSize && navTextSize !== "md" ? { navTextSize } : {}),
    contactEmail: str(raw?.contactEmail) || fixture.contactEmail,
    contactNote: toLocaleMap(raw?.contactNote, fixture.contactNote || ""),
  };
}

export function siteSignature(site: SiteSettings): string {
  const normalized = normalizeSiteSettings(site, site.source);
  return JSON.stringify({
    siteTitle: normalized.siteTitle,
    nav: normalized.nav,
    navTextColor: normalized.navTextColor ?? "",
    navTextSize: normalized.navTextSize ?? "md",
    contactEmail: normalized.contactEmail ?? "",
    contactNote: normalized.contactNote ?? {},
  });
}
