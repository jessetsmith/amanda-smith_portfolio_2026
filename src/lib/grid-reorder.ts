import { arrayMove } from "@dnd-kit/sortable";
import { sectionIndexRange } from "@/lib/grid-layout";
import type { GridItem } from "@/types/grid";

/**
 * Reorder by dropping active onto over:
 * 1) arrayMove so `order` updates
 * 2) swap placement when both are non-title and in the same section
 *    (including blankCell slots — empty columns are real drop targets)
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

  // Keep section isolation: only swap slots within the same band.
  if (!sameSection) {
    return moved;
  }

  const layoutA = {
    colStart: active.colStart,
    colSpan: active.colSpan,
    rowSpan: active.rowSpan ?? 1,
    rowStart: active.rowStart,
  };
  const layoutB = {
    colStart: over.colStart,
    colSpan: over.colSpan,
    rowSpan: over.rowSpan ?? 1,
    rowStart: over.rowStart,
  };

  return moved.map((item) => {
    if (item.id === activeId) return { ...item, ...layoutB };
    if (item.id === overId) return { ...item, ...layoutA };
    return item;
  });
}
