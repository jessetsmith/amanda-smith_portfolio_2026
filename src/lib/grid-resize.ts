import {
  packGridSectioned,
  sectionIndexRange,
  stripBlankCells,
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
 * Apply colStart/colSpan/rowSpan change within one titleRow section only.
 * Growing a content block shifts overlapped neighbours sideways/down (see
 * `reflowContentResize`); shrinking leaves vacancy blanks, which are derived
 * by the section pack. Blocks never leave their section.
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
  if (item.kind === "blankCell") return items;
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

  return reflowContentResize(items, item, patch);
}

type SectionRect = GridGeom;
type PushDir = "right" | "left" | "down" | "up";

/** Rows scanned when wrapping a displaced block; far beyond any real section. */
const MAX_WRAP_ROWS = 200;

/**
 * Resize a content block and make room for it directionally.
 *
 * The public/admin layout is a dense first-fit pack of (colStart, colSpan,
 * rowSpan) in array order, so reflow is expressed as a geometry problem and
 * written back as new `colStart`s (plus a (row, col) re-sort of the section
 * only if the pack would not otherwise reproduce the geometry):
 *
 * - growing east/west: overlapped blocks move to the next adjacent column in
 *   that direction, same row, cascading and consuming blank (unoccupied) cells
 *   first; only when no column is left do they wrap to the next free row;
 * - growing to full width, or growing south: overlapped blocks move down, and
 *   only in the columns they occupy;
 * - growing north: overlapped blocks move up, falling back to down when the
 *   section top is reached;
 * - shrinking just leaves blanks (derived by the vacancy fill);
 * - displaced blocks never change size and never leave their section.
 */
function reflowContentResize(
  items: GridItem[],
  item: GridItem,
  patch: Partial<
    Pick<GridItem, "colStart" | "colSpan" | "rowSpan" | "rowStart">
  >,
): GridItem[] {
  const base = stripBlankCells(items).map((row) => {
    const next = { ...row } as GridItem;
    delete (next as { rowStart?: number }).rowStart;
    return next;
  });
  const id = item.id;
  const range = sectionIndexRange(base, id);
  if (!range) return items;
  const packed = packGridSectioned(base);
  const old = packed.get(id);
  if (!old) return items;

  const section = base.slice(range.start, range.end + 1);
  const title = section[0].kind === "titleRow" ? section[0] : null;
  const titleGeom = title ? packed.get(title.id) : undefined;
  const sectionTop = titleGeom ? titleGeom.row + titleGeom.h : 1;

  const newC = clamp(patch.colStart ?? old.col, 1, GRID_COLUMNS);
  const newW = clamp(patch.colSpan ?? old.w, 1, GRID_COLUMNS - newC + 1);
  const newH = clamp(patch.rowSpan ?? old.h, 1, 4);
  const requestedRow =
    typeof patch.rowStart === "number" && patch.rowStart >= 1
      ? Math.floor(patch.rowStart)
      : old.row;
  const newR = Math.max(sectionTop, Math.min(requestedRow, old.row + old.h - 1));

  const target: SectionRect = { col: newC, row: newR, w: newW, h: newH };
  if (
    target.col === old.col &&
    target.row === old.row &&
    target.w === old.w &&
    target.h === old.h
  ) {
    return items;
  }

  const geoms = new Map<string, SectionRect>();
  for (const row of section) {
    const g = packed.get(row.id);
    if (g) geoms.set(row.id, { ...g });
  }
  geoms.set(id, target);

  const fixed = new Set<string>([id]);
  if (title) fixed.add(title.id);

  function overlapped(rect: SectionRect, selfId?: string): string[] {
    const hits: { id: string; g: SectionRect }[] = [];
    for (const [gid, g] of geoms) {
      if (gid === selfId || fixed.has(gid) || !rectsOverlap(g, rect)) continue;
      hits.push({ id: gid, g });
    }
    hits.sort((a, b) => a.g.row - b.g.row || a.g.col - b.g.col);
    return hits.map((hit) => hit.id);
  }

  function isFree(rect: SectionRect, ignoreId: string): boolean {
    for (const [gid, g] of geoms) {
      if (gid !== ignoreId && rectsOverlap(g, rect)) return false;
    }
    return true;
  }

  /** No room in the pushed direction: take the next free slot below. */
  function wrap(blockId: string) {
    const block = geoms.get(blockId);
    if (!block) return;
    for (let row = Math.max(sectionTop, block.row + 1); row < MAX_WRAP_ROWS; row += 1) {
      for (let col = 1; col + block.w - 1 <= GRID_COLUMNS; col += 1) {
        const slot = { col, row, w: block.w, h: block.h };
        if (isFree(slot, blockId)) {
          block.col = col;
          block.row = row;
          return;
        }
      }
    }
  }

  function push(
    dir: PushDir,
    rect: SectionRect,
    edge: number,
    selfId?: string,
    depth = 0,
  ) {
    if (depth > 64) return;
    for (const blockId of overlapped(rect, selfId)) {
      const block = geoms.get(blockId);
      if (!block || !rectsOverlap(block, rect)) continue;
      switch (dir) {
        case "right":
          if (edge + block.w - 1 <= GRID_COLUMNS) {
            block.col = edge;
            push("right", block, block.col + block.w, blockId, depth + 1);
          } else {
            wrap(blockId);
          }
          break;
        case "left":
          if (edge - block.w >= 1) {
            block.col = edge - block.w;
            push("left", block, block.col, blockId, depth + 1);
          } else {
            wrap(blockId);
          }
          break;
        case "down":
          block.row = edge;
          push("down", block, block.row + block.h, blockId, depth + 1);
          break;
        case "up":
          if (edge - block.h >= sectionTop) {
            block.row = edge - block.h;
            push("up", block, block.row, blockId, depth + 1);
          } else {
            block.row = target.row + target.h;
            push("down", block, block.row + block.h, blockId, depth + 1);
          }
          break;
      }
    }
  }

  const oldRight = old.col + old.w;
  const newRight = target.col + target.w;
  const oldBottom = old.row + old.h;
  const newBottom = target.row + target.h;
  const growEast = newRight > oldRight;
  const growWest = target.col < old.col;
  const growSouth = newBottom > oldBottom;
  const growNorth = target.row < old.row;
  const fullWidth = target.col === 1 && target.w === GRID_COLUMNS;

  const rowsForSides =
    growSouth || growNorth
      ? { row: old.row, h: old.h }
      : { row: target.row, h: target.h };

  if (growEast) {
    const ext = {
      col: oldRight,
      w: newRight - oldRight,
      ...rowsForSides,
    };
    if (fullWidth) push("down", ext, rowsForSides.row + rowsForSides.h);
    else push("right", ext, newRight);
  }
  if (growWest) {
    const ext = {
      col: target.col,
      w: old.col - target.col,
      ...rowsForSides,
    };
    if (fullWidth) push("down", ext, rowsForSides.row + rowsForSides.h);
    else push("left", ext, target.col);
  }
  if (growSouth) {
    push(
      "down",
      { col: target.col, w: target.w, row: oldBottom, h: newBottom - oldBottom },
      newBottom,
    );
  }
  if (growNorth) {
    push(
      "up",
      { col: target.col, w: target.w, row: target.row, h: old.row - target.row },
      target.row,
    );
  }

  const patched = section.map((row): GridItem => {
    const g = geoms.get(row.id);
    if (!g || row.kind === "titleRow") return row;
    if (row.id === id) {
      return {
        ...row,
        colStart: g.col,
        colSpan: g.w,
        rowSpan: g.h,
      } as GridItem;
    }
    return { ...row, colStart: g.col } as GridItem;
  });

  const withSection = (rows: GridItem[]): GridItem[] => [
    ...base.slice(0, range.start),
    ...rows,
    ...base.slice(range.end + 1),
  ];

  // Dense first-fit follows array order; re-sort the section by (row, col)
  // only when the current order would not reproduce the computed geometry.
  const simulated = packGridSectioned(withSection(patched));
  const reproduces = patched.every((row) => {
    if (row.kind === "titleRow") return true;
    const want = geoms.get(row.id);
    const got = simulated.get(row.id);
    return Boolean(
      want && got && want.col === got.col && want.row === got.row,
    );
  });

  let ordered = patched;
  if (!reproduces) {
    const lead = patched.filter((row) => row.kind === "titleRow");
    const content = patched
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.kind !== "titleRow")
      .sort((a, b) => {
        const ga = geoms.get(a.row.id)!;
        const gb = geoms.get(b.row.id)!;
        return ga.row - gb.row || ga.col - gb.col || a.index - b.index;
      })
      .map(({ row }) => row);
    ordered = [...lead, ...content];
  }

  return finalize(withSection(ordered));
}

export function isBlankCell(item: GridItem): item is BlankCellItem {
  return item.kind === "blankCell";
}
