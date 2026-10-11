import { arrayMove } from "@dnd-kit/sortable";
import { sectionIndexRange } from "@/lib/grid-layout";
import { GRID_COLUMNS, type GridItem } from "@/types/grid";

/**
 * Reorder by dropping active onto over:
 * 1) arrayMove so `order` updates
 * 2) same-section placement move — **never** adopt the target’s colSpan/rowSpan.
 *    Content size is owned by the block; blanks adapt via finalize afterward.
 *
 * Caller should run normalize/finalize afterward so vacancies refill.
 */
export function reorderGridItems(
  items: GridItem[],
  activeId: string,
  overId: string,
): GridItem[] {
  if (activeId === overId) return items;
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) return items;

  const active = items[oldIndex];
  const over = items[newIndex];
  const moved = arrayMove(items, oldIndex, newIndex);

  // titleRow is always full-bleed — only move in sequence, keep geometry
  if (active.kind === "titleRow" || over.kind === "titleRow") {
    return moved;
  }

  const activeSection = sectionIndexRange(items, activeId);
  const overSection = sectionIndexRange(items, overId);
  const sameSection =
    activeSection &&
    overSection &&
    activeSection.start === overSection.start &&
    activeSection.end === overSection.end;

  // Keep section isolation: only relocate within the same band.
  if (!sameSection) {
    return moved;
  }

  const activeW = active.colSpan;
  const activeH = active.rowSpan ?? 1;
  const overW = over.colSpan;
  const overH = over.rowSpan ?? 1;

  // Drop onto blank: take the blank’s anchor (colStart/rowStart) only.
  // Keep the moved block’s spans. Drop the blank — finalize refills vacancies.
  if (over.kind === "blankCell") {
    const maxStart = GRID_COLUMNS - activeW + 1;
    const colStart = Math.min(Math.max(1, over.colStart), maxStart);
    return moved
      .filter((item) => item.id !== overId)
      .map((item) => {
        if (item.id !== activeId) return item;
        const next = {
          ...item,
          colStart,
          colSpan: activeW,
          rowSpan: activeH,
        } as GridItem;
        if (typeof over.rowStart === "number") {
          (next as { rowStart?: number }).rowStart = over.rowStart;
        } else {
          delete (next as { rowStart?: number }).rowStart;
        }
        return next;
      });
  }

  // Drop blank onto content: move the content to the blank’s old anchor,
  // keep content spans; blank is removed and refilled by finalize.
  if (active.kind === "blankCell") {
    const maxStart = GRID_COLUMNS - overW + 1;
    const colStart = Math.min(Math.max(1, active.colStart), maxStart);
    return moved
      .filter((item) => item.id !== activeId)
      .map((item) => {
        if (item.id !== overId) return item;
        const next = {
          ...item,
          colStart,
          colSpan: overW,
          rowSpan: overH,
        } as GridItem;
        if (typeof active.rowStart === "number") {
          (next as { rowStart?: number }).rowStart = active.rowStart;
        } else {
          delete (next as { rowStart?: number }).rowStart;
        }
        return next;
      });
  }

  // Content ↔ content: swap anchors only; each keeps its own spans.
  return moved.map((item) => {
    if (item.id === activeId) {
      const next = {
        ...item,
        colStart: over.colStart,
        colSpan: activeW,
        rowSpan: activeH,
      } as GridItem;
      if (typeof over.rowStart === "number") {
        (next as { rowStart?: number }).rowStart = over.rowStart;
      } else {
        delete (next as { rowStart?: number }).rowStart;
      }
      return next;
    }
    if (item.id === overId) {
      const next = {
        ...item,
        colStart: active.colStart,
        colSpan: overW,
        rowSpan: overH,
      } as GridItem;
      if (typeof active.rowStart === "number") {
        (next as { rowStart?: number }).rowStart = active.rowStart;
      } else {
        delete (next as { rowStart?: number }).rowStart;
      }
      return next;
    }
    return item;
  });
}
