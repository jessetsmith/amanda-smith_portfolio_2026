import { normalizeGridItems } from "@/lib/grid-normalize";
import { GRID_COLUMNS, type BlankCellItem, type GridItem } from "@/types/grid";

export type GridGeom = {
  col: number;
  row: number;
  w: number;
  h: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function itemSize(item: GridItem): { col: number; w: number; h: number } {
  if (item.kind === "titleRow") {
    return { col: 1, w: GRID_COLUMNS, h: item.rowSpan ?? 1 };
  }
  const col = clamp(item.colStart, 1, GRID_COLUMNS);
  const w = clamp(item.colSpan, 1, GRID_COLUMNS - col + 1);
  const h = clamp(item.rowSpan ?? 1, 1, 4);
  return { col, w, h };
}

/** CSS-grid-like packing without dense backfill. */
export function packGrid(items: GridItem[]): Map<string, GridGeom> {
  const occ = new Set<string>();
  const placed = new Map<string, GridGeom>();

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

  for (const item of items) {
    const { col, w, h } = itemSize(item);
    let row = 1;
    while (!fits(col, row, w, h)) row += 1;
    mark(col, row, w, h);
    placed.set(item.id, { col, row, w, h });
  }

  return placed;
}

function makeBlank(colStart: number, colSpan: number, rowSpan: number): BlankCellItem {
  const col = clamp(colStart, 1, GRID_COLUMNS);
  const span = clamp(colSpan, 1, GRID_COLUMNS - col + 1);
  return {
    id: `blank-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    order: 0,
    kind: "blankCell",
    colStart: col,
    colSpan: span,
    rowSpan: clamp(rowSpan, 1, 4),
  };
}

function rectsOverlap(a: GridGeom, b: GridGeom): boolean {
  return (
    a.col < b.col + b.w &&
    a.col + a.w > b.col &&
    a.row < b.row + b.h &&
    a.row + a.h > b.row
  );
}

/** Remaining axis-aligned pieces of `blank` after cutting out `cut`. */
function subtractRect(blank: GridGeom, cut: GridGeom): GridGeom[] {
  if (!rectsOverlap(blank, cut)) return [blank];

  const parts: GridGeom[] = [];
  const overlapCol = Math.max(blank.col, cut.col);
  const overlapColEnd = Math.min(blank.col + blank.w, cut.col + cut.w);
  const overlapRow = Math.max(blank.row, cut.row);
  const overlapRowEnd = Math.min(blank.row + blank.h, cut.row + cut.h);

  // Left
  if (blank.col < overlapCol) {
    parts.push({
      col: blank.col,
      row: blank.row,
      w: overlapCol - blank.col,
      h: blank.h,
    });
  }
  // Right
  if (blank.col + blank.w > overlapColEnd) {
    parts.push({
      col: overlapColEnd,
      row: blank.row,
      w: blank.col + blank.w - overlapColEnd,
      h: blank.h,
    });
  }
  // Top (middle band only)
  if (blank.row < overlapRow) {
    parts.push({
      col: overlapCol,
      row: blank.row,
      w: overlapColEnd - overlapCol,
      h: overlapRow - blank.row,
    });
  }
  // Bottom (middle band only)
  if (blank.row + blank.h > overlapRowEnd) {
    parts.push({
      col: overlapCol,
      row: overlapRowEnd,
      w: overlapColEnd - overlapCol,
      h: blank.row + blank.h - overlapRowEnd,
    });
  }

  return parts.filter((p) => p.w > 0 && p.h > 0);
}

function consumeBlanks(
  items: GridItem[],
  packed: Map<string, GridGeom>,
  footprint: GridGeom,
): GridItem[] {
  const next: GridItem[] = [];

  for (const item of items) {
    if (item.kind !== "blankCell") {
      next.push(item);
      continue;
    }
    const geom = packed.get(item.id);
    if (!geom || !rectsOverlap(geom, footprint)) {
      next.push(item);
      continue;
    }
    const remainders = subtractRect(geom, footprint);
    for (const part of remainders) {
      next.push(
        makeBlank(part.col, part.w, part.h),
      );
    }
  }

  return next;
}

function insertBlanksAfter(
  items: GridItem[],
  afterIndex: number,
  blanks: BlankCellItem[],
): GridItem[] {
  if (blanks.length === 0) return items;
  const next = [...items];
  next.splice(afterIndex + 1, 0, ...blanks);
  return next;
}

/**
 * Apply colStart/colSpan/rowSpan change: insert blankCell spacers on shrink,
 * consume overlapping blanks on grow. Keeps later sections from reflowing up.
 */
export function applyGridResize(
  items: GridItem[],
  id: string,
  patch: Partial<Pick<GridItem, "colStart" | "colSpan" | "rowSpan">>,
): GridItem[] {
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return items;

  const item = items[idx];
  const packed = packGrid(items);
  const geom = packed.get(id);
  if (!geom) return items;

  if (item.kind === "titleRow") {
    const rowSpan = clamp(patch.rowSpan ?? item.rowSpan ?? 1, 1, 4);
    if (rowSpan === (item.rowSpan ?? 1)) return items;
    const updated = items.map((row) =>
      row.id === id ? ({ ...row, rowSpan } as GridItem) : row,
    );
    if (rowSpan < (item.rowSpan ?? 1)) {
      const blank = makeBlank(1, GRID_COLUMNS, (item.rowSpan ?? 1) - rowSpan);
      return normalizeGridItems(insertBlanksAfter(updated, idx, [blank]));
    }
    const footprint: GridGeom = {
      col: 1,
      row: geom.row,
      w: GRID_COLUMNS,
      h: rowSpan,
    };
    return normalizeGridItems(consumeBlanks(updated, packed, footprint));
  }

  const oldC = item.colStart;
  const oldW = item.colSpan;
  const oldH = item.rowSpan ?? 1;
  const newC = clamp(patch.colStart ?? oldC, 1, GRID_COLUMNS);
  const maxSpan = GRID_COLUMNS - newC + 1;
  const newW = clamp(patch.colSpan ?? oldW, 1, maxSpan);
  const newH = clamp(patch.rowSpan ?? oldH, 1, 4);

  if (newC === oldC && newW === oldW && newH === oldH) return items;

  let next = items.map((row) =>
    row.id === id
      ? ({ ...row, colStart: newC, colSpan: newW, rowSpan: newH } as GridItem)
      : row,
  );

  const neu: GridGeom = { col: newC, row: geom.row, w: newW, h: newH };
  const old: GridGeom = { col: oldC, row: geom.row, w: oldW, h: oldH };

  // Grow / shift into neighbors: eat blanks in the new footprint.
  if (newW > oldW || newH > oldH || newC !== oldC) {
    next = consumeBlanks(next, packed, neu);
  }

  // Shrink: park blank spacers in vacated cells (same band, after this item).
  const blanks: BlankCellItem[] = [];
  if (newW < oldW) {
    blanks.push(
      makeBlank(newC + newW, oldC + oldW - (newC + newW), oldH),
    );
  }
  if (newH < oldH) {
    blanks.push(makeBlank(newC, newW, oldH - newH));
  }

  // If colStart moved right, vacated left strip.
  if (newC > oldC) {
    blanks.push(makeBlank(oldC, newC - oldC, oldH));
  }

  next = insertBlanksAfter(next, idx, blanks);

  // Drop zero-area / invalid and resequence.
  next = next.filter((row) => {
    if (row.kind !== "blankCell") return true;
    return row.colSpan >= 1 && (row.rowSpan ?? 1) >= 1;
  });

  return normalizeGridItems(next);
}

export function isBlankCell(item: GridItem): item is BlankCellItem {
  return item.kind === "blankCell";
}
