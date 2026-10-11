import { GRID_COLUMNS, type GridItem } from "@/types/grid";

export type GridGeom = {
  col: number;
  row: number;
  w: number;
  h: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function itemSize(item: GridItem): { col: number; w: number; h: number } {
  if (item.kind === "titleRow") {
    return { col: 1, w: GRID_COLUMNS, h: item.rowSpan ?? 1 };
  }
  const col = clamp(item.colStart, 1, GRID_COLUMNS);
  const w = clamp(item.colSpan, 1, GRID_COLUMNS - col + 1);
  const h = clamp(item.rowSpan ?? 1, 1, 4);
  return { col, w, h };
}

/** Inclusive index range of the section containing `id` (titleRow → next titleRow). */
export function sectionIndexRange(
  items: GridItem[],
  id: string,
): { start: number; end: number } | null {
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return null;

  let start = idx;
  while (start > 0 && items[start].kind !== "titleRow") start -= 1;
  if (items[start].kind !== "titleRow") start = 0;

  let end = idx;
  while (end + 1 < items.length && items[end + 1].kind !== "titleRow") {
    end += 1;
  }
  return { start, end };
}

/**
 * Pack items with section isolation: each titleRow band is packed on its own,
 * and the next section always starts on a row below the previous section’s
 * furthest cell. That prevents foreign-section items from filling holes.
 */
export function packGridSectioned(items: GridItem[]): Map<string, GridGeom> {
  const placed = new Map<string, GridGeom>();
  let sectionMinRow = 1;
  let i = 0;

  while (i < items.length) {
    const start = i;
    // Section opens at titleRow, or at 0 for a preamble without a title.
    if (items[i].kind === "titleRow") {
      i += 1;
      while (i < items.length && items[i].kind !== "titleRow") i += 1;
    } else {
      while (i < items.length && items[i].kind !== "titleRow") i += 1;
    }
    const section = items.slice(start, i);

    const occ = new Set<string>();
    function fits(col: number, row: number, w: number, h: number): boolean {
      for (let r = row; r < row + h; r += 1) {
        for (let c = col; c < col + w; c += 1) {
          if (c < 1 || c > GRID_COLUMNS || occ.has(`${c},${r}`)) return false;
        }
      }
      return true;
    }
    function mark(col: number, row: number, w: number, h: number) {
      for (let r = row; r < row + h; r += 1) {
        for (let c = col; c < col + w; c += 1) {
          occ.add(`${c},${r}`);
        }
      }
    }

    let sectionMaxEnd = sectionMinRow - 1;
    for (const item of section) {
      const { col, w, h } = itemSize(item);
      let row = sectionMinRow;
      while (!fits(col, row, w, h)) row += 1;
      mark(col, row, w, h);
      placed.set(item.id, { col, row, w, h });
      sectionMaxEnd = Math.max(sectionMaxEnd, row + h - 1);
    }
    sectionMinRow = sectionMaxEnd + 1;
  }

  return placed;
}

/** Stamp explicit rowStart from section-isolated packing. */
export function assignSectionRows(items: GridItem[]): GridItem[] {
  const packed = packGridSectioned(items);
  return items.map((item) => {
    const geom = packed.get(item.id);
    if (!geom) return item;
    return { ...item, rowStart: geom.row } as GridItem;
  });
}
