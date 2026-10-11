import {
  GRID_COLUMNS,
  type BlankCellItem,
  type GridItem,
} from "@/types/grid";

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

export function iterSections(
  items: GridItem[],
): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let i = 0;
  while (i < items.length) {
    const start = i;
    if (items[i].kind === "titleRow") {
      i += 1;
      while (i < items.length && items[i].kind !== "titleRow") i += 1;
    } else {
      while (i < items.length && items[i].kind !== "titleRow") i += 1;
    }
    ranges.push({ start, end: i - 1 });
  }
  return ranges;
}

function makeBlank(colStart: number, colSpan: number, rowSpan = 1): BlankCellItem {
  const col = clamp(colStart, 1, GRID_COLUMNS);
  const span = clamp(colSpan, 1, GRID_COLUMNS - col + 1);
  return {
    id: `blank-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    order: 0,
    kind: "blankCell",
    colStart: col,
    colSpan: span,
    rowSpan: clamp(rowSpan, 1, 4),
  };
}

/**
 * Pack items with section isolation: each titleRow band is packed on its own,
 * and the next section always starts on a row below the previous section’s
 * furthest cell. That prevents foreign-section items from filling holes.
 */
export function packGridSectioned(items: GridItem[]): Map<string, GridGeom> {
  const placed = new Map<string, GridGeom>();
  let sectionMinRow = 1;

  for (const range of iterSections(items)) {
    const section = items.slice(range.start, range.end + 1);
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
      // Prefer an explicit rowStart when it still fits (vacancy blanks).
      const preferred =
        typeof item.rowStart === "number" && item.rowStart >= sectionMinRow
          ? item.rowStart
          : null;
      let row = sectionMinRow;
      if (preferred && fits(col, preferred, w, h)) {
        row = preferred;
      } else {
        while (!fits(col, row, w, h)) row += 1;
      }
      mark(col, row, w, h);
      placed.set(item.id, { col, row, w, h });
      sectionMaxEnd = Math.max(sectionMaxEnd, row + h - 1);
    }
    sectionMinRow = Math.max(sectionMinRow, sectionMaxEnd + 1);
  }

  return placed;
}

/**
 * Insert unlabeled blankCell spacers for every unoccupied cell in each
 * section band so empty columns are real resize/drop targets.
 */
export function fillSectionVacancies(items: GridItem[]): GridItem[] {
  if (items.length === 0) return items;

  const packed = packGridSectioned(items);
  const next = [...items];
  // Insert from the end so earlier section indices stay stable.
  const ranges = iterSections(next);

  for (let s = ranges.length - 1; s >= 0; s -= 1) {
    const { start, end } = ranges[s];
    const section = next.slice(start, end + 1);
    if (section.length === 0) continue;

    const geoms = section
      .map((item) => packed.get(item.id))
      .filter((g): g is GridGeom => Boolean(g));
    if (geoms.length === 0) continue;

    const rowMin = Math.min(...geoms.map((g) => g.row));
    const rowMax = Math.max(...geoms.map((g) => g.row + g.h - 1));
    const occ = new Set<string>();
    for (const g of geoms) {
      for (let r = g.row; r < g.row + g.h; r += 1) {
        for (let c = g.col; c < g.col + g.w; c += 1) {
          occ.add(`${c},${r}`);
        }
      }
    }

    const blanks: BlankCellItem[] = [];
    for (let row = rowMin; row <= rowMax; row += 1) {
      let col = 1;
      while (col <= GRID_COLUMNS) {
        if (occ.has(`${col},${row}`)) {
          col += 1;
          continue;
        }
        const runStart = col;
        while (col <= GRID_COLUMNS && !occ.has(`${col},${row}`)) col += 1;
        const blank = makeBlank(runStart, col - runStart, 1);
        blank.rowStart = row;
        blanks.push(blank);
      }
    }

    if (blanks.length === 0) continue;
    // Park spacers at the end of the section (before the next titleRow).
    next.splice(end + 1, 0, ...blanks);
  }

  return next;
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

/**
 * Fill empty cells with spacers, then lock explicit rowStarts.
 * Idempotent once a section band is fully occupied.
 */
export function finalizeGridLayout(items: GridItem[]): GridItem[] {
  const locked = assignSectionRows(fillSectionVacancies(items));
  return locked.map((item, index) => ({ ...item, order: index + 1 }));
}
