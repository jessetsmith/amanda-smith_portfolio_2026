import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import siteFixture from "@/data/site-settings.json";
import { applySiteOverlays } from "@/lib/i18n/apply-overlays";
import { toLocaleMap } from "@/lib/i18n/resolve";
import { sanityFetchOptions } from "@/lib/sanity-fetch";
import { CELL_TEXT_SIZES, type CellTextSize } from "@/types/grid";
import type { NavItem, SiteSettings } from "@/types/content";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";
import { isSanityConfigured } from "@/sanity/env";
import { siteSettingsQuery } from "@/sanity/lib/queries";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "site-settings.json");

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

function fixtureSite(): SiteSettings {
  return applySiteOverlays(
    normalizeSiteSettings(
      {
        siteTitle: siteFixture.siteTitle,
        nav: siteFixture.nav,
        contactEmail: siteFixture.contactEmail,
        contactNote: siteFixture.contactNote,
      },
      "fixture",
    ),
  );
}

async function readLocalSite(): Promise<SiteSettings> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalizeSiteSettings(
      JSON.parse(raw) as Partial<SiteSettings>,
      "fixture",
    );
  } catch {
    return fixtureSite();
  }
}

async function writeLocalSite(site: SiteSettings): Promise<SiteSettings> {
  const normalized = normalizeSiteSettings(site, site.source);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function documentFields(site: SiteSettings) {
  return {
    siteTitle: site.siteTitle,
    nav: site.nav.map((item) => ({
      _type: "object" as const,
      _key: item.href.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "nav",
      label: item.label,
      href: item.href,
    })),
    navTextColor: site.navTextColor || undefined,
    navTextSize:
      site.navTextSize && site.navTextSize !== "md"
        ? site.navTextSize
        : undefined,
    contactEmail: site.contactEmail || undefined,
    contactNote: site.contactNote || undefined,
  };
}

export async function loadSiteSettings(): Promise<SiteSettings> {
  if (isSanityConfigured() && client) {
    try {
      const data = await client.fetch(siteSettingsQuery, {}, sanityFetchOptions);
      if (data) {
        return normalizeSiteSettings(data, "sanity");
      }
    } catch {
      // fall through
    }
  }
  return readLocalSite();
}

export async function saveSiteSettings(
  site: SiteSettings,
): Promise<SiteSettings> {
  const normalized = normalizeSiteSettings(site, site.source);
  const writeClient = getWriteClient();

  if (writeClient) {
    try {
      await writeClient.createOrReplace({
        _id: "siteSettings",
        _type: "siteSettings",
        ...documentFields(normalized),
      });
      await writeLocalSite({ ...normalized, source: "sanity" }).catch(
        () => undefined,
      );
      const refreshed = await loadSiteSettings();
      if (refreshed.source === "sanity") return refreshed;
      return { ...normalized, source: "sanity" };
    } catch (err) {
      console.error("Sanity site settings save failed, falling back to .data", err);
    }
  }

  return writeLocalSite({ ...normalized, source: "fixture" });
}
