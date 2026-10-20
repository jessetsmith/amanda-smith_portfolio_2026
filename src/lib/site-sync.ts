import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import siteFixture from "@/data/site-settings.json";
import { applySiteOverlays } from "@/lib/i18n/apply-overlays";
import { sanityFetchOptions } from "@/lib/sanity-fetch";
import { normalizeSiteSettings } from "@/lib/site";
import type { SiteSettings } from "@/types/content";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";
import { isSanityConfigured } from "@/sanity/env";
import { siteSettingsQuery } from "@/sanity/lib/queries";

export { normalizeSiteSettings, siteSignature } from "@/lib/site";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "site-settings.json");

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
      // Return what we wrote — do not refetch (Next fetch cache can drop
      // newly written fields like navTextSize and reset admin dropdowns).
      const saved = { ...normalized, source: "sanity" as const };
      await writeLocalSite(saved).catch(() => undefined);
      return saved;
    } catch (err) {
      console.error("Sanity site settings save failed, falling back to .data", err);
    }
  }

  return writeLocalSite({ ...normalized, source: "fixture" });
}
