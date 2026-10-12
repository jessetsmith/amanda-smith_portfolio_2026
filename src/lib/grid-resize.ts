import {
  packGridSectioned,
  sectionIndexRange,
  type GridGeom,
} from "@/lib/grid-layout";
import { normalizeGridItems } from "@/lib/grid-normalize";
import { GRID_COLUMNS, type BlankCellItem, type GridItem } from "@/types/grid";

export type { GridGeom };
export { packGridSectioned as packGrid } from "@/lib/grid-layout";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
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

  if (blank.col < overlapCol) {
    parts.push({
      col: blank.col,
      row: blank.row,
      w: overlapCol - blank.col,
      h: blank.h,
    });
  }
  if (blank.col + blank.w > overlapColEnd) {
    parts.push({
      col: overlapColEnd,
      row: blank.row,
      w: blank.col + blank.w - overlapColEnd,
      h: blank.h,
    });
  }
  if (blank.row < overlapRow) {
    parts.push({
      col: overlapCol,
      row: blank.row,
      w: overlapColEnd - overlapCol,
      h: overlapRow - blank.row,
    });
  }
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

/** Only consume blanks that live in the same section index range. */
function consumeBlanksInSection(
  items: GridItem[],
  packed: Map<string, GridGeom>,
  footprint: GridGeom,
  range: { start: number; end: number },
): GridItem[] {
  const next: GridItem[] = [];
  const sectionIds = new Set(
    items.slice(range.start, range.end + 1).map((item) => item.id),
  );

  for (const item of items) {
    if (item.kind !== "blankCell" || !sectionIds.has(item.id)) {
      next.push(item);
      continue;
    }
    const geom = packed.get(item.id);
    if (!geom || !rectsOverlap(geom, footprint)) {
      next.push(item);
      continue;
    }
    for (const part of subtractRect(geom, footprint)) {
      next.push(makeBlank(part.col, part.w, part.h));
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

function finalize(items: GridItem[]): GridItem[] {
  return normalizeGridItems(items);
}

/**
 * Apply colStart/colSpan/rowSpan change within one titleRow section only:
 * insert unlabeled blankCell spacers on shrink; consume same-section blanks
 * on grow. Section-isolated rowStarts keep foreign sections from packing up.
 */
export function applyGridResize(
  items: GridItem[],
  id: string,
  patch: Partial<
    Pick<GridItem, "colStart" | "colSpan" | "rowSpan" | "rowStart">
  >,
): GridItem[] {
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return items;

  const range = sectionIndexRange(items, id);
  if (!range) return items;

  const item = items[idx];
  const packed = packGridSectioned(items);
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
      return finalize(insertBlanksAfter(updated, idx, [blank]));
    }
    const footprint: GridGeom = {
      col: 1,
      row: geom.row,
      w: GRID_COLUMNS,
      h: rowSpan,
    };
    return finalize(consumeBlanksInSection(updated, packed, footprint, range));
  }

  const oldC = item.colStart;
  const oldW = item.colSpan;
  const oldH = item.rowSpan ?? 1;
  const oldR = geom.row;
  const newC = clamp(patch.colStart ?? oldC, 1, GRID_COLUMNS);
  const maxSpan = GRID_COLUMNS - newC + 1;
  const newW = clamp(patch.colSpan ?? oldW, 1, maxSpan);
  const newH = clamp(patch.rowSpan ?? oldH, 1, 4);
  const newR =
    typeof patch.rowStart === "number" && patch.rowStart >= 1
      ? Math.floor(patch.rowStart)
      : oldR;

  if (
    newC === oldC &&
    newW === oldW &&
    newH === oldH &&
    newR === oldR
  ) {
    return items;
  }

  let next = items.map((row) =>
    row.id === id
      ? ({
          ...row,
          colStart: newC,
          colSpan: newW,
          rowSpan: newH,
          rowStart: newR,
        } as GridItem)
      : row,
  );

  const neu: GridGeom = { col: newC, row: newR, w: newW, h: newH };

  // Grow / shift: eat blanks in this section only.
  if (
    newW > oldW ||
    newH > oldH ||
    newC !== oldC ||
    newR !== oldR
  ) {
    next = consumeBlanksInSection(next, packed, neu, range);
  }

  // Shrink / shift: park spacers in vacated cells (same section, after item).
  const blanks: BlankCellItem[] = [];
  if (newW < oldW && newC === oldC) {
    // Shrunk from the right
    blanks.push(makeBlank(newC + newW, oldW - newW, oldH));
  }
  if (newC > oldC) {
    // Shrunk or shifted from the left — vacate old left columns
    blanks.push(makeBlank(oldC, newC - oldC, oldH));
  }
  if (newR > oldR) {
    // Shrunk or shifted from the top
    const topBlank = makeBlank(oldC, oldW, newR - oldR);
    topBlank.rowStart = oldR;
    blanks.push(topBlank);
  } else if (newH < oldH && newR === oldR) {
    // Shrunk from the bottom
    const bottomBlank = makeBlank(newC, newW, oldH - newH);
    bottomBlank.rowStart = newR + newH;
    blanks.push(bottomBlank);
  }

  next = insertBlanksAfter(next, idx, blanks);
  next = next.filter((row) => {
    if (row.kind !== "blankCell") return true;
    return row.colSpan >= 1 && (row.rowSpan ?? 1) >= 1;
  });

  return finalize(next);
}

export function isBlankCell(item: GridItem): item is BlankCellItem {
  return item.kind === "blankCell";
}
