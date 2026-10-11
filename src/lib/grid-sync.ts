import seed from "@/data/homepage-grid.json";
import {
  readGridItems as readLocalGridItems,
  resetGridItems as resetLocalGridItems,
  writeGridItems as writeLocalGridItems,
} from "@/lib/grid-store";
import { normalizeGridItems } from "@/lib/grid-normalize";
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

export function mapSanityGridItems(raw: unknown): GridItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const mapped = raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    const projectRef = row.projectRef as
      | { title?: string; summary?: string; year?: string }
      | undefined;
    const kind = String(row.kind || "textCell");
    const featured = Boolean(row.featured);
    const base = {
      id: String(row.id || row._key || `sanity-${index + 1}`),
      order: Number(row.order ?? index + 1),
      colStart: Number(row.colStart ?? 1),
      colSpan: Number(row.colSpan ?? 1),
      rowSpan: Number(row.rowSpan ?? 1),
      fill: row.fill as GridItem["fill"],
      ...(featured ? { featured: true as const } : {}),
    };

    if (kind === "projectCell") {
      return {
        ...base,
        kind: "projectCell" as const,
        meta: row.meta as string | undefined,
        title: String(row.title || projectRef?.title || "Untitled"),
        subtitle: row.subtitle as string | undefined,
        year: (row.year as string) || projectRef?.year,
        summary: (row.summary as string) || projectRef?.summary,
        imageSrc: row.imageSrc as string | undefined,
        imageAlt: row.imageAlt as string | undefined,
        placeholderTone:
          (row.placeholderTone as "warm" | "cool" | "ink") || "cool",
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
        meta: row.meta as string | undefined,
        title: row.title as string | undefined,
        caption: (row.caption as string) || "Media",
        description: row.description as string | undefined,
        imageSrc: row.imageSrc as string | undefined,
        imageAlt: row.imageAlt as string | undefined,
        placeholderTone:
          (row.placeholderTone as "warm" | "cool" | "ink") || "warm",
      };
    }
    return {
      ...base,
      kind: "textCell" as const,
      meta: row.meta as string | undefined,
      headline: String(row.headline || "Headline"),
      subtitle: row.subtitle as string | undefined,
      excerpt: row.excerpt as string | undefined,
      imageSrc: row.imageSrc as string | undefined,
      imageAlt: row.imageAlt as string | undefined,
      placeholderTone:
        (row.placeholderTone as "warm" | "cool" | "ink") || "warm",
    };
  });
  return normalizeGridItems(mapped as GridItem[]);
}

export function toSanityGridItems(items: GridItem[]) {
  return normalizeGridItems(items).map((item) => {
    const { id, ...rest } = item;
    return {
      _type: "gridItem" as const,
      _key: sanitizeKey(id, item.order),
      ...rest,
    };
  });
}

export async function loadGridItems(): Promise<GridSyncResult> {
  if (isSanityConfigured() && client) {
    try {
      const data = await client.fetch(homepageQuery);
      const sanityGrid = mapSanityGridItems(data?.gridItems);
      if (sanityGrid) {
        return { items: sanityGrid, source: "sanity" };
      }
    } catch {
      // fall through
    }
  }
  return { items: await readLocalGridItems(), source: "fixture" };
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
  const seeded = normalizeGridItems(seed as GridItem[]);
  return saveGridItems(seeded);
}

/** Local-only reset helper (tests / explicit fallback). */
export async function resetLocalOnly(): Promise<GridItem[]> {
  return resetLocalGridItems();
}
