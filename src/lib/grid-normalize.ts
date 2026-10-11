import type { CellFill, GridItem, GridItemKind } from "@/types/grid";
import { GRID_COLUMNS } from "@/types/grid";

const FILLS: CellFill[] = ["rust", "ochre", "sage", "tan", "paper", "ink"];
const KINDS: GridItemKind[] = [
  "titleRow",
  "colorCell",
  "mediaCell",
  "textCell",
  "projectCell",
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
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

  const base = {
    id,
    order,
    colStart: kind === "titleRow" ? 1 : colStart,
    colSpan,
    rowSpan,
  };

  switch (kind) {
    case "titleRow":
      return {
        ...base,
        kind: "titleRow",
        label:
          "label" in item && typeof item.label === "string"
            ? item.label
            : "Section",
      };
    case "colorCell": {
      const fill =
        "fill" in item && FILLS.includes(item.fill as CellFill)
          ? (item.fill as CellFill)
          : "rust";
      return {
        ...base,
        kind: "colorCell",
        fill,
        label:
          "label" in item && typeof item.label === "string"
            ? item.label
            : undefined,
        href:
          "href" in item && typeof item.href === "string" ? item.href : undefined,
      };
    }
    case "mediaCell":
      return {
        ...base,
        kind: "mediaCell",
        caption:
          "caption" in item && typeof item.caption === "string"
            ? item.caption
            : "Media",
        placeholderTone:
          "placeholderTone" in item &&
          (item.placeholderTone === "warm" ||
            item.placeholderTone === "cool" ||
            item.placeholderTone === "ink")
            ? item.placeholderTone
            : "warm",
      };
    case "projectCell":
      return {
        ...base,
        kind: "projectCell",
        title:
          "title" in item && typeof item.title === "string"
            ? item.title
            : "Untitled project",
        year:
          "year" in item && typeof item.year === "string" ? item.year : undefined,
        summary:
          "summary" in item && typeof item.summary === "string"
            ? item.summary
            : undefined,
        href:
          "href" in item && typeof item.href === "string" ? item.href : undefined,
      };
    case "textCell":
    default:
      return {
        ...base,
        kind: "textCell",
        headline:
          "headline" in item && typeof item.headline === "string"
            ? item.headline
            : "Headline",
        excerpt:
          "excerpt" in item && typeof item.excerpt === "string"
            ? item.excerpt
            : undefined,
        meta:
          "meta" in item && typeof item.meta === "string" ? item.meta : undefined,
      };
  }
}

export function normalizeGridItems(items: GridItem[]): GridItem[] {
  return items.map((item, index) => normalizeGridItem(item, index + 1));
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
        colSpan: 2,
        rowSpan: 1,
        caption: "Media",
        placeholderTone: "warm",
      };
    case "projectCell":
      return {
        id,
        order,
        kind,
        colStart: 1,
        colSpan: 3,
        rowSpan: 1,
        title: "New project",
        year: String(new Date().getFullYear()),
        summary: "Short summary",
      };
    case "textCell":
    default:
      return {
        id,
        order,
        kind: "textCell",
        colStart: 1,
        colSpan: 3,
        rowSpan: 1,
        headline: "New text block",
        excerpt: "Supporting copy",
        meta: "Meta",
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
