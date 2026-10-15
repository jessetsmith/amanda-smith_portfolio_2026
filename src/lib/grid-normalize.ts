import { normalizeItemLayouts } from "@/lib/grid-breakpoints";
import { finalizeGridLayout } from "@/lib/grid-layout";
import { toLocaleMap, type LocaleString } from "@/lib/i18n/resolve";
import type {
  CellFill,
  GridItem,
  GridItemKind,
  PlaceholderTone,
} from "@/types/grid";
import { GRID_COLUMNS } from "@/types/grid";

const FILLS: CellFill[] = ["rust", "ochre", "sage", "tan", "paper", "ink"];
const KINDS: GridItemKind[] = [
  "titleRow",
  "colorCell",
  "mediaCell",
  "textCell",
  "projectCell",
  "blankCell",
];
const TONES: PlaceholderTone[] = ["warm", "cool", "ink"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function loc(value: unknown, fallback = ""): LocaleString {
  const map = toLocaleMap(value, fallback);
  return Object.keys(map).length ? map : fallback ? { en: fallback } : {};
}

function locOpt(value: unknown): LocaleString | undefined {
  const map = toLocaleMap(value);
  return Object.keys(map).length ? map : undefined;
}

function tone(value: unknown, fallback: PlaceholderTone = "warm"): PlaceholderTone {
  return TONES.includes(value as PlaceholderTone)
    ? (value as PlaceholderTone)
    : fallback;
}

export function normalizeGridItem(item: GridItem, order: number): GridItem {
  const kind = KINDS.includes(item.kind) ? item.kind : "textCell";
  const colStart = clamp(item.colStart ?? 1, 1, GRID_COLUMNS);
  const maxSpan = GRID_COLUMNS - colStart + 1;
  const colSpan =
    kind === "titleRow" ? GRID_COLUMNS : clamp(item.colSpan ?? 1, 1, maxSpan);
  const rowSpan = clamp(item.rowSpan ?? 1, 1, 4);
  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id
      : `${kind}-${order}`;

  const featured = Boolean((item as { featured?: boolean }).featured);
  const rowStartRaw = (item as { rowStart?: number }).rowStart;
  const rowStart =
    typeof rowStartRaw === "number" && rowStartRaw >= 1
      ? Math.floor(rowStartRaw)
      : undefined;
  const layouts = normalizeItemLayouts(
    (item as { layouts?: unknown }).layouts,
  );
  const base = {
    id,
    order,
    colStart: kind === "titleRow" ? 1 : colStart,
    colSpan,
    rowSpan,
    ...(rowStart ? { rowStart } : {}),
    ...(featured ? { featured: true as const } : {}),
    ...(layouts ? { layouts } : {}),
  };

  switch (kind) {
    case "titleRow": {
      const sectionRowsRaw = (item as { sectionRows?: number }).sectionRows;
      const sectionRows =
        typeof sectionRowsRaw === "number" && sectionRowsRaw >= 1
          ? Math.min(24, Math.floor(sectionRowsRaw))
          : undefined;
      const hidden = Boolean((item as { hidden?: boolean }).hidden);
      return {
        ...base,
        kind: "titleRow",
        label: loc((item as { label?: unknown }).label, "Section"),
        ...(sectionRows ? { sectionRows } : {}),
        ...(hidden ? { hidden: true as const } : {}),
      };
    }
    case "colorCell": {
      const fill =
        "fill" in item && FILLS.includes(item.fill as CellFill)
          ? (item.fill as CellFill)
          : "rust";
      const prose = locOpt((item as { prose?: unknown }).prose);
      return {
        ...base,
        kind: "colorCell",
        fill,
        label: locOpt((item as { label?: unknown }).label),
        href: str((item as { href?: string }).href),
        ...(prose ? { prose } : {}),
      };
    }
    case "mediaCell": {
      const row = item as unknown as Record<string, unknown>;
      return {
        ...base,
        kind: "mediaCell",
        meta: locOpt(row.meta),
        title: locOpt(row.title),
        caption: loc(row.caption, "Media"),
        description: locOpt(row.description),
        href: str(row.href),
        imageSrc: str(row.imageSrc),
        imageAlt: locOpt(row.imageAlt),
        placeholderTone: tone(row.placeholderTone, "warm"),
      };
    }
    case "projectCell": {
      const row = item as unknown as Record<string, unknown>;
      return {
        ...base,
        kind: "projectCell",
        meta: locOpt(row.meta),
        title: loc(row.title, "Untitled project"),
        subtitle: locOpt(row.subtitle),
        year: str(row.year),
        summary: locOpt(row.summary),
        href: str(row.href),
        imageSrc: str(row.imageSrc),
        imageAlt: locOpt(row.imageAlt),
        placeholderTone: tone(row.placeholderTone, "cool"),
      };
    }
    case "blankCell":
      return {
        ...base,
        kind: "blankCell",
      };
    case "textCell":
    default: {
      const row = item as unknown as Record<string, unknown>;
      return {
        ...base,
        kind: "textCell",
        meta: locOpt(row.meta),
        headline: loc(row.headline, "Headline"),
        subtitle: locOpt(row.subtitle),
        excerpt: locOpt(row.excerpt),
        href: str(row.href),
        imageSrc: str(row.imageSrc),
        imageAlt: locOpt(row.imageAlt),
        placeholderTone: tone(row.placeholderTone, "warm"),
      };
    }
  }
}

export function normalizeGridItems(items: GridItem[]): GridItem[] {
  const normalized = items.map((item, index) =>
    normalizeGridItem(item, index + 1),
  );
  // Fill empty cells with unlabeled spacers + lock section-isolated rows.
  return finalizeGridLayout(normalized);
}

export function createGridItem(kind: GridItemKind, order: number): GridItem {
  const id = `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  switch (kind) {
    case "titleRow":
      return {
        id,
        order,
        kind,
        colStart: 1,
        colSpan: 4,
        rowSpan: 1,
        label: { en: "New section" },
      };
    case "colorCell":
      return {
        id,
        order,
        kind,
        colStart: 1,
        colSpan: 1,
        rowSpan: 1,
        fill: "rust",
        label: { en: "Accent" },
      };
    case "mediaCell":
      return {
        id,
        order,
        kind,
        colStart: 1,
        colSpan: 1,
        rowSpan: 2,
        meta: { en: "Media" },
        title: { en: "New media" },
        caption: { en: "Image" },
        description: { en: "Supporting note under the image." },
        placeholderTone: "warm",
      };
    case "projectCell":
      return {
        id,
        order,
        kind,
        colStart: 1,
        colSpan: 1,
        rowSpan: 2,
        meta: { en: "Project" },
        title: { en: "New project" },
        subtitle: { en: "Subtitle" },
        year: String(new Date().getFullYear()),
        summary: { en: "Short summary below the image." },
        placeholderTone: "cool",
      };
    case "blankCell":
      return {
        id,
        order,
        kind: "blankCell",
        colStart: 1,
        colSpan: 1,
        rowSpan: 1,
      };
    case "textCell":
    default:
      return {
        id,
        order,
        kind: "textCell",
        colStart: 1,
        colSpan: 1,
        rowSpan: 2,
        meta: { en: "Meta" },
        headline: { en: "New text block" },
        subtitle: { en: "Subtitle" },
        excerpt: { en: "Description below the image." },
        placeholderTone: "warm",
      };
  }
}

export function duplicateGridItem(item: GridItem, order: number): GridItem {
  return normalizeGridItem(
    {
      ...item,
      id: `${item.kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      order,
    },
    order,
  );
}
