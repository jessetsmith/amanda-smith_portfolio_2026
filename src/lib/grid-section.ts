import { sectionIndexRange } from "@/lib/grid-layout";
import {
  createGridItem,
  normalizeGridItem,
} from "@/lib/grid-normalize";
import {
  GRID_COLUMNS,
  type GridItem,
  type GridItemKind,
  type TitleRowItem,
} from "@/types/grid";

export type ContentSection = {
  titleId: string;
  label: string;
  start: number;
  end: number;
};

/** titleRow bands in document order (Practice / Projects / …). */
export function listContentSections(items: GridItem[]): ContentSection[] {
  const sections: ContentSection[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.kind !== "titleRow") continue;
    let end = i;
    while (end + 1 < items.length && items[end + 1].kind !== "titleRow") {
      end += 1;
    }
    sections.push({
      titleId: item.id,
      label: item.label || "Section",
      start: i,
      end,
    });
  }
  return sections;
}

/** Section band for an item — membership is structural (nearest preceding titleRow). */
export function contentSectionOf(
  items: GridItem[],
  itemId: string,
): ContentSection | null {
  const range = sectionIndexRange(items, itemId);
  if (!range) return null;
  const head = items[range.start];
  if (head?.kind !== "titleRow") return null;
  return {
    titleId: head.id,
    label: head.label || "Section",
    start: range.start,
    end: range.end,
  };
}

/**
 * Convert a cell in place: keep id + placement/spans, swap kind + default content.
 * titleRow always becomes full-bleed.
 */
export function convertGridItemKind(
  item: GridItem,
  kind: GridItemKind,
): GridItem {
  const fresh = createGridItem(kind, item.order);
  const colStart = kind === "titleRow" ? 1 : item.colStart;
  const colSpan =
    kind === "titleRow"
      ? GRID_COLUMNS
      : Math.min(item.colSpan, GRID_COLUMNS - colStart + 1);
  const keepFeatured =
    Boolean(item.featured) &&
    (kind === "mediaCell" || kind === "textCell" || kind === "projectCell");

  return normalizeGridItem(
    {
      ...fresh,
      id: item.id,
      order: item.order,
      colStart,
      colSpan,
      rowSpan: item.rowSpan ?? 1,
      ...(typeof item.rowStart === "number" ? { rowStart: item.rowStart } : {}),
      ...(keepFeatured ? { featured: true as const } : {}),
    },
    item.order,
  );
}

/**
 * Add a cell type:
 * - With selection → populate/convert that cell in place (keep placement).
 * - With no selection → append a new titleRow band at the bottom (+ cell unless
 *   the added kind is itself a titleRow).
 */
export function addGridItem(
  items: GridItem[],
  kind: GridItemKind,
  selectedId: string | null,
): { items: GridItem[]; selectedId: string } {
  if (selectedId) {
    const idx = items.findIndex((item) => item.id === selectedId);
    if (idx >= 0) {
      const converted = convertGridItemKind(items[idx], kind);
      const next = [...items];
      next[idx] = converted;
      return { items: next, selectedId: converted.id };
    }
  }

  const next = [...items];
  if (kind === "titleRow") {
    const title = createGridItem("titleRow", next.length + 1) as TitleRowItem;
    title.label = "New section";
    next.push(title);
    return { items: next, selectedId: title.id };
  }

  const title = createGridItem("titleRow", next.length + 1) as TitleRowItem;
  title.label = "New section";
  const cell = createGridItem(kind, next.length + 2);
  next.push(title, cell);
  return { items: next, selectedId: cell.id };
}

export type SectionTarget =
  | { type: "existing"; titleId: string }
  | { type: "new"; label: string };

/**
 * Move a non-title block into another content section (or a newly created one).
 * Vacancy blanks / rowStarts are rebuilt by the caller via normalize/finalize.
 */
export function moveItemToContentSection(
  items: GridItem[],
  itemId: string,
  target: SectionTarget,
): GridItem[] {
  const idx = items.findIndex((item) => item.id === itemId);
  if (idx < 0) return items;

  const item = items[idx];
  if (item.kind === "titleRow") return items;

  const current = contentSectionOf(items, itemId);
  if (target.type === "existing" && current?.titleId === target.titleId) {
    return items;
  }

  const moved: GridItem = { ...item };
  delete (moved as { rowStart?: number }).rowStart;

  let next = items.filter((row) => row.id !== itemId);

  if (target.type === "new") {
    const label = target.label.trim() || "New section";
    const title = createGridItem("titleRow", next.length + 1) as TitleRowItem;
    title.label = label;
    next.push(title, moved);
    return next;
  }

  const sections = listContentSections(next);
  const dest = sections.find((section) => section.titleId === target.titleId);
  if (!dest) return items;

  // Park at end of destination band (before the following titleRow).
  next = [...next];
  next.splice(dest.end + 1, 0, moved);
  return next;
}
