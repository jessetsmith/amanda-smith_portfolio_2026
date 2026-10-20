import seed from "@/data/homepage-grid.json";
import {
  readGridItems as readLocalGridItems,
  resetGridItems as resetLocalGridItems,
  writeGridItems as writeLocalGridItems,
} from "@/lib/grid-store";
import { normalizeItemLayouts } from "@/lib/grid-breakpoints";
import { normalizeGridItems } from "@/lib/grid-normalize";
import { toLocaleMap, type LocaleString } from "@/lib/i18n/resolve";
import { sanityFetchOptions } from "@/lib/sanity-fetch";
import type { GridItem } from "@/types/grid";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";
import { isSanityConfigured } from "@/sanity/env";
import { homepageQuery } from "@/sanity/lib/queries";

export type GridSource = "sanity" | "fixture";

export interface GridSyncResult {
  items: GridItem[];
  source: GridSource;
}

function sanitizeKey(id: string, order: number): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || `item-${order}`;
}

function loc(value: unknown, fallback = ""): LocaleString {
  const map = toLocaleMap(value, fallback);
  return Object.keys(map).length ? map : fallback ? { en: fallback } : {};
}

function locOpt(value: unknown): LocaleString | undefined {
  const map = toLocaleMap(value);
  return Object.keys(map).length ? map : undefined;
}

export function mapSanityGridItems(raw: unknown): GridItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const mapped = raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    const projectRef = row.projectRef as
      | { title?: string; summary?: string; year?: string }
      | undefined;
    const kind = String(row.kind || "textCell");
    const featured = Boolean(row.featured);
    const textColor =
      typeof row.textColor === "string" && row.textColor.trim()
        ? row.textColor.trim()
        : undefined;
    const textSize =
      row.textSize === "sm" ||
      row.textSize === "md" ||
      row.textSize === "lg" ||
      row.textSize === "xl"
        ? row.textSize
        : undefined;
    const rowStartNum = Number(row.rowStart);
    const layouts = normalizeItemLayouts(row.layouts);
    const base = {
      id: String(row.id || row._key || `sanity-${index + 1}`),
      order: Number(row.order ?? index + 1),
      colStart: Number(row.colStart ?? 1),
      colSpan: Number(row.colSpan ?? 1),
      rowSpan: Number(row.rowSpan ?? 1),
      fill: row.fill as GridItem["fill"],
      ...(Number.isFinite(rowStartNum) && rowStartNum >= 1
        ? { rowStart: Math.floor(rowStartNum) }
        : {}),
      ...(featured ? { featured: true as const } : {}),
      ...(textColor ? { textColor } : {}),
      ...(textSize && textSize !== "md" ? { textSize } : {}),
      ...(layouts ? { layouts } : {}),
    };

    const href =
      typeof row.href === "string" && row.href.trim()
        ? row.href.trim()
        : typeof (projectRef as { url?: string } | undefined)?.url === "string"
          ? (projectRef as { url?: string }).url
          : undefined;

    if (kind === "projectCell") {
      return {
        ...base,
        kind: "projectCell" as const,
        meta: locOpt(row.meta),
        title: loc(row.title || projectRef?.title, "Untitled"),
        subtitle: locOpt(row.subtitle),
        year: (typeof row.year === "string" ? row.year : undefined) || projectRef?.year,
        summary: locOpt(row.summary || projectRef?.summary),
        href,
        imageSrc: row.imageSrc as string | undefined,
        imageAlt: locOpt(row.imageAlt),
        placeholderTone:
          (row.placeholderTone as "warm" | "cool" | "ink") || "cool",
      };
    }
    if (kind === "titleRow") {
      const sectionRowsNum = Number(row.sectionRows);
      const hidden = Boolean(row.hidden);
      return {
        ...base,
        kind: "titleRow" as const,
        label: loc(row.label, "Section"),
        ...(Number.isFinite(sectionRowsNum) && sectionRowsNum >= 1
          ? { sectionRows: Math.floor(sectionRowsNum) }
          : {}),
        ...(hidden ? { hidden: true as const } : {}),
      };
    }
    if (kind === "colorCell") {
      const prose = locOpt(row.prose);
      const subcategory = locOpt(row.subcategory);
      return {
        ...base,
        kind: "colorCell" as const,
        fill: (row.fill as GridItem["fill"]) || "rust",
        label: locOpt(row.label),
        href,
        ...(subcategory ? { subcategory } : {}),
        ...(prose ? { prose } : {}),
      };
    }
    if (kind === "mediaCell") {
      return {
        ...base,
        kind: "mediaCell" as const,
        meta: locOpt(row.meta),
        title: locOpt(row.title),
        caption: loc(row.caption, "Media"),
        description: locOpt(row.description),
        href,
        imageSrc: row.imageSrc as string | undefined,
        imageAlt: locOpt(row.imageAlt),
        placeholderTone:
          (row.placeholderTone as "warm" | "cool" | "ink") || "warm",
      };
    }
    if (kind === "blankCell") {
      return {
        ...base,
        kind: "blankCell" as const,
      };
    }
    return {
      ...base,
      kind: "textCell" as const,
      meta: locOpt(row.meta),
      headline: loc(row.headline, "Headline"),
      subtitle: locOpt(row.subtitle),
      excerpt: locOpt(row.excerpt),
      href,
      imageSrc: row.imageSrc as string | undefined,
      imageAlt: locOpt(row.imageAlt),
      placeholderTone:
        (row.placeholderTone as "warm" | "cool" | "ink") || "warm",
    };
  });
  return normalizeGridItems(mapped as GridItem[]);
}

/** Expand fixture plain strings into locale maps (EN) so public + admin share types. */
export function localizeFixtureGridItems(items: GridItem[]): GridItem[] {
  return normalizeGridItems(
    items.map((item) => {
      if (item.kind === "titleRow") {
        return { ...item, label: loc(item.label, "Section") };
      }
      if (item.kind === "colorCell") {
        const prose = locOpt(item.prose);
        const subcategory = locOpt(item.subcategory);
        return {
          ...item,
          label: locOpt(item.label),
          ...(subcategory ? { subcategory } : {}),
          ...(prose ? { prose } : {}),
        };
      }
      if (item.kind === "textCell") {
        return {
          ...item,
          meta: locOpt(item.meta),
          headline: loc(item.headline, "Headline"),
          subtitle: locOpt(item.subtitle),
          excerpt: locOpt(item.excerpt),
          imageAlt: locOpt(item.imageAlt),
        };
      }
      if (item.kind === "mediaCell") {
        return {
          ...item,
          meta: locOpt(item.meta),
          title: locOpt(item.title),
          caption: loc(item.caption, "Media"),
          description: locOpt(item.description),
          imageAlt: locOpt(item.imageAlt),
        };
      }
      if (item.kind === "projectCell") {
        return {
          ...item,
          meta: locOpt(item.meta),
          title: loc(item.title, "Untitled"),
          subtitle: locOpt(item.subtitle),
          summary: locOpt(item.summary),
          imageAlt: locOpt(item.imageAlt),
        };
      }
      return item;
    }),
  );
}

export function toSanityGridItems(items: GridItem[]) {
  return normalizeGridItems(items).map((item) => {
    const { id, ...rest } = item;
    return {
      _type: "gridItem" as const,
      _key: sanitizeKey(id, item.order),
      id,
      ...rest,
    };
  });
}

const HOMEPAGE_FETCH = sanityFetchOptions;

export async function loadGridItems(): Promise<GridSyncResult> {
  if (isSanityConfigured() && client) {
    try {
      const data = await client.fetch(homepageQuery, {}, HOMEPAGE_FETCH);
      const sanityGrid = mapSanityGridItems(data?.gridItems);
      if (sanityGrid) {
        return { items: sanityGrid, source: "sanity" };
      }
    } catch {
      // fall through
    }
  }
  const local = await readLocalGridItems();
  return { items: localizeFixtureGridItems(local), source: "fixture" };
}

export async function saveGridItems(
  items: GridItem[],
): Promise<GridSyncResult> {
  const normalized = normalizeGridItems(items);
  const writeClient = getWriteClient();

  if (writeClient) {
    try {
      const gridItems = toSanityGridItems(normalized);
      const existing = await writeClient.fetch<{ _id?: string } | null>(
        `*[_type == "homepage" && _id == "homepage"][0]{_id}`,
      );

      if (existing?._id) {
        await writeClient.patch("homepage").set({ gridItems }).commit();
      } else {
        await writeClient.createOrReplace({
          _id: "homepage",
          _type: "homepage",
          title: "Homepage",
          introMaskText: "Amanda Smith",
          introSupport:
            "Exhibitions, research, and writing — arranged as one connected grid.",
          introVideoUrl: "/media/intro.mp4",
          gridItems,
        });
      }

      // Mirror locally as offline cache only
      await writeLocalGridItems(normalized).catch(() => undefined);
      return { items: normalized, source: "sanity" };
    } catch (err) {
      console.error("Sanity grid save failed, falling back to .data", err);
    }
  }

  const local = await writeLocalGridItems(normalized);
  return { items: local, source: "fixture" };
}

export async function resetGridToSeed(): Promise<GridSyncResult> {
  const seeded = localizeFixtureGridItems(
    normalizeGridItems(seed as GridItem[]),
  );
  return saveGridItems(seeded);
}

/** Local-only reset helper (tests / explicit fallback). */
export async function resetLocalOnly(): Promise<GridItem[]> {
  return resetLocalGridItems();
}
