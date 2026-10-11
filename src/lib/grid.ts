import type { CellFill, GridItem } from "@/types/grid";
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

/** Desktop (md+) placement via inline styles; mobile stacks via CSS. */
export function gridPlacementStyle(item: GridItem): CSSProperties {
  const start = clamp(item.colStart, 1, 12);
  const span = clamp(item.colSpan, 1, 13 - start);
  const rowSpan = item.rowSpan && item.rowSpan > 1 ? item.rowSpan : 1;

  return {
    ["--grid-col" as string]:
      item.kind === "titleRow" ? "1 / -1" : `${start} / span ${span}`,
    ["--grid-row-span" as string]: String(rowSpan),
  };
}

export function sortGridItems(items: GridItem[]): GridItem[] {
  return [...items].sort((a, b) => a.order - b.order);
}
