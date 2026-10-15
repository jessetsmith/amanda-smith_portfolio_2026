import { normalizeItemLayouts } from "@/lib/grid-breakpoints";
import { finalizeGridLayout } from "@/lib/grid-layout";
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
  return typeof value === "string" ? value : undefined;
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
        label: str((item as { label?: string }).label) || "Section",
        ...(sectionRows ? { sectionRows } : {}),
        ...(hidden ? { hidden: true as const } : {}),
      };
    }
    case "colorCell": {
      const fill =
        "fill" in item && FILLS.includes(item.fill as CellFill)
          ? (item.fill as CellFill)
          : "rust";
      return {
        ...base,
        kind: "colorCell",
        fill,
        label: str((item as { label?: string }).label),
        href: str((item as { href?: string }).href),
      };
    }
    case "mediaCell": {
      const row = item as {
        meta?: string;
        title?: string;
        caption?: string;
        description?: string;
        href?: string;
        imageSrc?: string;
        imageAlt?: string;
        placeholderTone?: PlaceholderTone;
      };
      return {
        ...base,
        kind: "mediaCell",
        meta: str(row.meta),
        title: str(row.title),
        caption: str(row.caption) || "Media",
        description: str(row.description),
        href: str(row.href),
        imageSrc: str(row.imageSrc),
        imageAlt: str(row.imageAlt),
        placeholderTone: tone(row.placeholderTone, "warm"),
      };
    }
    case "projectCell": {
      const row = item as {
        meta?: string;
        title?: string;
        subtitle?: string;
        year?: string;
        summary?: string;
        href?: string;
        imageSrc?: string;
        imageAlt?: string;
        placeholderTone?: PlaceholderTone;
      };
      return {
        ...base,
        kind: "projectCell",
        meta: str(row.meta),
        title: str(row.title) || "Untitled project",
        subtitle: str(row.subtitle),
        year: str(row.year),
        summary: str(row.summary),
        href: str(row.href),
        imageSrc: str(row.imageSrc),
        imageAlt: str(row.imageAlt),
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
      const row = item as {
        meta?: string;
        headline?: string;
        subtitle?: string;
        excerpt?: string;
        href?: string;
        imageSrc?: string;
        imageAlt?: string;
        placeholderTone?: PlaceholderTone;
      };
      return {
        ...base,
        kind: "textCell",
        meta: str(row.meta),
        headline: str(row.headline) || "Headline",
        subtitle: str(row.subtitle),
        excerpt: str(row.excerpt),
        href: str(row.href),
        imageSrc: str(row.imageSrc),
        imageAlt: str(row.imageAlt),
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
        label: "New section",
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
        label: "Accent",
      };
    case "mediaCell":
      return {
        id,
        order,
        kind,
        colStart: 1,
        colSpan: 1,
        rowSpan: 2,
        meta: "Media",
        title: "New media",
        caption: "Image",
        description: "Supporting note under the image.",
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
        meta: "Project",
        title: "New project",
        subtitle: "Subtitle",
        year: String(new Date().getFullYear()),
        summary: "Short summary below the image.",
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
        meta: "Meta",
        headline: "New text block",
        subtitle: "Subtitle",
        excerpt: "Description below the image.",
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
