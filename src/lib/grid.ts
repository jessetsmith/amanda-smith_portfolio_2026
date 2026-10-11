import type { CellFill, GridItem } from "@/types/grid";
import { GRID_COLUMNS } from "@/types/grid";
import type { CSSProperties } from "react";

const FILL_CLASS: Record<CellFill, string> = {
  rust: "bg-rust text-paper",
  ochre: "bg-ochre text-ink",
  sage: "bg-sage text-ink",
  tan: "bg-tan text-ink",
  paper: "bg-paper text-ink",
  ink: "bg-ink text-paper",
};

export function fillClass(fill?: CellFill): string {
  if (!fill) return "bg-transparent text-ink";
  return FILL_CLASS[fill];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Direct grid placement (not CSS variables — var() + `1 / span n`
 * was collapsing columns into overlapping strips).
 * Mobile CSS forces full-width stack.
 */
export function gridPlacementStyle(item: GridItem): CSSProperties {
  const start = clamp(item.colStart, 1, GRID_COLUMNS);
  const maxSpan = GRID_COLUMNS - start + 1;
  const span =
    item.kind === "titleRow"
      ? GRID_COLUMNS
      : clamp(item.colSpan, 1, maxSpan);
  const rowSpan = item.rowSpan && item.rowSpan > 1 ? item.rowSpan : 1;
  const rowStart =
    typeof item.rowStart === "number" && item.rowStart >= 1
      ? Math.floor(item.rowStart)
      : undefined;

  return {
    gridColumn: item.kind === "titleRow" ? "1 / -1" : `${start} / span ${span}`,
    // Explicit rowStart locks section bands; mobile CSS forces auto stack.
    gridRow: rowStart ? `${rowStart} / span ${rowSpan}` : `span ${rowSpan}`,
  };
}

export function sortGridItems(items: GridItem[]): GridItem[] {
  return [...items].sort((a, b) => a.order - b.order);
}
