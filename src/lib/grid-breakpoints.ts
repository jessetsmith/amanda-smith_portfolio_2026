import type {
  GridItem,
  ItemLayouts,
  LayoutBreakpoint,
  LayoutPlacement,
} from "@/types/grid";
import {
  BREAKPOINT_COLUMNS,
  GRID_COLUMNS,
} from "@/types/grid";
import { stripBlankCells } from "@/lib/grid-layout";

export const PREVIEW_FRAME_WIDTH: Record<LayoutBreakpoint, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 390,
};

export const BREAKPOINT_LABEL: Record<LayoutBreakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

function cleanPlacement(raw: LayoutPlacement, columns: number): LayoutPlacement {
  const colStart = clamp(Math.floor(raw.colStart), 1, columns);
  const maxSpan = columns - colStart + 1;
  const colSpan = clamp(Math.floor(raw.colSpan), 1, maxSpan);
  const rowSpan = clamp(Math.floor(raw.rowSpan ?? 1), 1, 4);
  const order =
    typeof raw.order === "number" && Number.isFinite(raw.order)
      ? Math.floor(raw.order)
      : undefined;
  const rowStart =
    typeof raw.rowStart === "number" && raw.rowStart >= 1
      ? Math.floor(raw.rowStart)
      : undefined;
  return {
    colStart,
    colSpan,
    rowSpan,
    ...(rowStart ? { rowStart } : {}),
    ...(order !== undefined ? { order } : {}),
  };
}

export function normalizeLayoutPlacement(
  value: unknown,
  columns: number,
): LayoutPlacement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const colStart = Number(row.colStart);
  const colSpan = Number(row.colSpan);
  if (!Number.isFinite(colStart) || !Number.isFinite(colSpan)) return undefined;
  return cleanPlacement(
    {
      colStart,
      colSpan,
      rowSpan: Number(row.rowSpan) || 1,
      rowStart:
        typeof row.rowStart === "number" ? row.rowStart : Number(row.rowStart),
      order: typeof row.order === "number" ? row.order : Number(row.order),
    },
    columns,
  );
}

export function normalizeItemLayouts(value: unknown): ItemLayouts | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const tablet = normalizeLayoutPlacement(
    row.tablet,
    BREAKPOINT_COLUMNS.tablet,
  );
  const mobile = normalizeLayoutPlacement(
    row.mobile,
    BREAKPOINT_COLUMNS.mobile,
  );
  if (!tablet && !mobile) return undefined;
  return {
    ...(tablet ? { tablet } : {}),
    ...(mobile ? { mobile } : {}),
  };
}

export function desktopPlacement(item: GridItem): LayoutPlacement {
  return cleanPlacement(
    {
      colStart: item.colStart,
      colSpan: item.colSpan,
      rowSpan: item.rowSpan ?? 1,
      rowStart: item.rowStart,
      order: item.order,
    },
    GRID_COLUMNS,
  );
}

/**
 * Default tablet/mobile placement matching public CSS stacking rules when no
 * custom override exists yet (1-col phones, 2-col tablet with featured full width).
 */
export function synthesizePlacement(
  item: GridItem,
  breakpoint: Exclude<LayoutBreakpoint, "desktop">,
  orderIndex: number,
): LayoutPlacement {
  const columns = BREAKPOINT_COLUMNS[breakpoint];
  if (item.kind === "titleRow") {
    return {
      colStart: 1,
      colSpan: columns,
      rowSpan: item.rowSpan ?? 1,
      order: orderIndex,
    };
  }
  if (breakpoint === "mobile") {
    return {
      colStart: 1,
      colSpan: 1,
      rowSpan: item.rowSpan ?? 1,
      order: orderIndex,
    };
  }
  // Tablet: featured / title-like leads span full width; others span 1 of 2.
  const featured = "featured" in item && Boolean(item.featured);
  return {
    colStart: 1,
    colSpan: featured ? 2 : 1,
    rowSpan: item.rowSpan ?? 1,
    order: orderIndex,
  };
}

export function hasCustomLayout(
  item: GridItem,
  breakpoint: Exclude<LayoutBreakpoint, "desktop">,
): boolean {
  return Boolean(item.layouts?.[breakpoint]);
}

export function effectivePlacement(
  item: GridItem,
  breakpoint: LayoutBreakpoint,
  orderIndex: number,
): LayoutPlacement {
  if (breakpoint === "desktop") return desktopPlacement(item);
  const custom = item.layouts?.[breakpoint];
  if (custom) {
    return cleanPlacement(
      { ...custom, order: custom.order ?? item.order },
      BREAKPOINT_COLUMNS[breakpoint],
    );
  }
  return synthesizePlacement(item, breakpoint, orderIndex);
}

function applyPlacementFields(
  item: GridItem,
  placement: LayoutPlacement,
): GridItem {
  const next = {
    ...item,
    colStart: placement.colStart,
    colSpan: placement.colSpan,
    rowSpan: placement.rowSpan ?? 1,
    order: placement.order ?? item.order,
  } as GridItem;
  if (placement.rowStart) {
    (next as { rowStart?: number }).rowStart = placement.rowStart;
  } else {
    delete (next as { rowStart?: number }).rowStart;
  }
  return next;
}

/**
 * Project canonical items into a flat list for the active breakpoint.
 * Tablet/mobile strip vacancy blanks (public CSS hides them) and apply
 * overrides or synthesized stacking so admin can edit without touching desktop.
 */
export function projectItemsForBreakpoint(
  items: GridItem[],
  breakpoint: LayoutBreakpoint,
): GridItem[] {
  if (breakpoint === "desktop") return items;

  const content = stripBlankCells(items);
  const withPlacement = content.map((item, index) => {
    const placement = effectivePlacement(item, breakpoint, index + 1);
    // Keep layouts on the projected copy so save round-trips stay intact if
    // something writes the projected array back — callers should write via
    // writeBreakpoint* helpers instead.
    return applyPlacementFields(item, placement);
  });

  return [...withPlacement].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
}

export function setItemLayout(
  item: GridItem,
  breakpoint: Exclude<LayoutBreakpoint, "desktop">,
  placement: LayoutPlacement,
): GridItem {
  const columns = BREAKPOINT_COLUMNS[breakpoint];
  const cleaned = cleanPlacement(placement, columns);
  if (item.kind === "titleRow") {
    cleaned.colStart = 1;
    cleaned.colSpan = columns;
  }
  const layouts: ItemLayouts = {
    ...(item.layouts ?? {}),
    [breakpoint]: cleaned,
  };
  return { ...item, layouts } as GridItem;
}

/**
 * Ensure every content item has an explicit override for `breakpoint`, seeding
 * from current synthesized/public defaults when missing. Call before the first
 * placement mutation so partial overrides don't mix auto-stack with custom.
 */
export function ensureBreakpointLayouts(
  items: GridItem[],
  breakpoint: Exclude<LayoutBreakpoint, "desktop">,
): GridItem[] {
  const content = stripBlankCells(items);
  const sorted = [...content].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
  const orderById = new Map(
    sorted.map((item, index) => [item.id, index + 1] as const),
  );

  return items.map((item) => {
    if (item.kind === "blankCell") return item;
    if (item.layouts?.[breakpoint]) return item;
    const orderIndex = orderById.get(item.id) ?? item.order;
    return setItemLayout(
      item,
      breakpoint,
      synthesizePlacement(item, breakpoint, orderIndex),
    );
  });
}

export type PlacementPatch = Partial<
  Pick<LayoutPlacement, "colStart" | "colSpan" | "rowSpan" | "rowStart" | "order">
>;

/**
 * Write a placement patch for the active breakpoint without mutating the other.
 * Desktop writes top-level fields; tablet/mobile write `layouts[bp]` only.
 */
export function writeBreakpointPlacement(
  items: GridItem[],
  id: string,
  breakpoint: LayoutBreakpoint,
  patch: PlacementPatch,
): GridItem[] {
  if (breakpoint === "desktop") {
    return items.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item } as GridItem;
      if (patch.colStart !== undefined) next.colStart = patch.colStart;
      if (patch.colSpan !== undefined) next.colSpan = patch.colSpan;
      if (patch.rowSpan !== undefined) next.rowSpan = patch.rowSpan;
      if (patch.order !== undefined) next.order = patch.order;
      if (patch.rowStart !== undefined) {
        if (patch.rowStart >= 1) {
          (next as { rowStart?: number }).rowStart = patch.rowStart;
        } else {
          delete (next as { rowStart?: number }).rowStart;
        }
      }
      return next;
    });
  }

  const seeded = ensureBreakpointLayouts(items, breakpoint);
  return seeded.map((item) => {
    if (item.id !== id || item.kind === "blankCell") return item;
    const current =
      item.layouts?.[breakpoint] ??
      synthesizePlacement(item, breakpoint, item.order);
    return setItemLayout(item, breakpoint, { ...current, ...patch });
  });
}

/**
 * Reorder within a breakpoint. Desktop uses array move + geom swap via the
 * existing reorder helper (caller). Tablet/mobile only rewrite `layouts[bp].order`
 * (and optional col anchors when swapping) — desktop fields stay untouched.
 */
export function reorderBreakpointLayouts(
  items: GridItem[],
  breakpoint: Exclude<LayoutBreakpoint, "desktop">,
  activeId: string,
  overId: string,
): GridItem[] {
  if (activeId === overId) return items;

  const seeded = ensureBreakpointLayouts(items, breakpoint);
  const projected = projectItemsForBreakpoint(seeded, breakpoint);
  const oldIndex = projected.findIndex((item) => item.id === activeId);
  const newIndex = projected.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) return seeded;

  const active = projected[oldIndex];
  const over = projected[newIndex];
  if (active.kind === "titleRow" || over.kind === "titleRow") {
    // Still allow sequence change of order keys, but keep title full-bleed.
  }

  const reordered = [...projected];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);

  // Swap column anchors for content↔content on tablet (mobile is 1-col).
  const columns = BREAKPOINT_COLUMNS[breakpoint];
  let swapActive: LayoutPlacement | null = null;
  let swapOver: LayoutPlacement | null = null;
  if (
    active.kind !== "titleRow" &&
    over.kind !== "titleRow" &&
    active.kind !== "blankCell" &&
    over.kind !== "blankCell" &&
    columns > 1
  ) {
    swapActive = {
      colStart: over.colStart,
      colSpan: Math.min(active.colSpan, columns),
      rowSpan: active.rowSpan ?? 1,
      rowStart: over.rowStart,
    };
    swapOver = {
      colStart: active.colStart,
      colSpan: Math.min(over.colSpan, columns),
      rowSpan: over.rowSpan ?? 1,
      rowStart: active.rowStart,
    };
  }

  const orderById = new Map(
    reordered.map((item, index) => [item.id, index + 1] as const),
  );

  return seeded.map((item) => {
    if (item.kind === "blankCell") return item;
    const order = orderById.get(item.id);
    if (order === undefined) return item;
    const current =
      item.layouts?.[breakpoint] ??
      synthesizePlacement(item, breakpoint, order);
    let nextPlacement: LayoutPlacement = { ...current, order };
    if (swapActive && item.id === activeId) {
      nextPlacement = { ...nextPlacement, ...swapActive, order };
    } else if (swapOver && item.id === overId) {
      nextPlacement = { ...nextPlacement, ...swapOver, order };
    }
    return setItemLayout(item, breakpoint, nextPlacement);
  });
}

/** CSS custom properties for public responsive placement (no layout flash). */
export function breakpointPlacementVars(item: GridItem): Record<string, string> {
  const contentIndexGuess = item.order;
  const tablet = effectivePlacement(item, "tablet", contentIndexGuess);
  const mobile = effectivePlacement(item, "mobile", contentIndexGuess);
  return {
    "--t-col-start": String(tablet.colStart),
    "--t-col-span": String(tablet.colSpan),
    "--t-row-span": String(tablet.rowSpan ?? 1),
    ...(tablet.rowStart
      ? { "--t-row-start": String(tablet.rowStart) }
      : { "--t-row-start": "auto" }),
    "--m-col-start": String(mobile.colStart),
    "--m-col-span": String(mobile.colSpan),
    "--m-row-span": String(mobile.rowSpan ?? 1),
    ...(mobile.rowStart
      ? { "--m-row-start": String(mobile.rowStart) }
      : { "--m-row-start": "auto" }),
  };
}
