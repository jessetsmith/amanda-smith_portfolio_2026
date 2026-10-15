import type { LocaleString } from "@/lib/i18n/resolve";

export type CellFill = "rust" | "ochre" | "sage" | "tan" | "paper" | "ink";

export type PlaceholderTone = "warm" | "cool" | "ink";

export type GridItemKind =
  | "titleRow"
  | "colorCell"
  | "mediaCell"
  | "textCell"
  | "projectCell"
  | "blankCell";

/** Homepage grid is max 4 columns. Spans are 1–4. */
export const GRID_COLUMNS = 4 as const;

/** Editable layout breakpoints (desktop is the base placement on the item). */
export type LayoutBreakpoint = "desktop" | "tablet" | "mobile";

export const LAYOUT_BREAKPOINTS: LayoutBreakpoint[] = [
  "desktop",
  "tablet",
  "mobile",
];

/** Column count used when editing / packing each breakpoint. */
export const BREAKPOINT_COLUMNS: Record<LayoutBreakpoint, number> = {
  desktop: GRID_COLUMNS,
  tablet: 2,
  mobile: 1,
};

/**
 * Per-breakpoint placement override. Desktop uses the top-level col/row fields;
 * tablet/mobile store independent overrides here so edits never rewrite desktop.
 */
export interface LayoutPlacement {
  colStart: number;
  colSpan: number;
  rowStart?: number;
  rowSpan?: number;
  /** Sort key within this breakpoint (falls back to item.order). */
  order?: number;
}

export interface ItemLayouts {
  tablet?: LayoutPlacement;
  mobile?: LayoutPlacement;
}

export interface GridItemBase {
  id: string;
  order: number;
  kind: GridItemKind;
  /** 1-based column start on the 4-col grid */
  colStart: number;
  /** Width in columns (1–4) */
  colSpan: number;
  /**
   * 1-based explicit row start from section-isolated packing.
   * Keeps later titleRow bands from auto-flowing into holes above.
   */
  rowStart?: number;
  rowSpan?: number;
  fill?: CellFill;
  /**
   * Section lead / highlighted card. Prefer one featured content cell
   * immediately after each titleRow at colSpan 2 (50% width); standards use 1.
   */
  featured?: boolean;
  /** Independent tablet/mobile placement — omitted until customized. */
  layouts?: ItemLayouts;
}

/**
 * Content section membership is structural: the nearest preceding titleRow
 * in the ordered grid array (Practice / Projects / …). Not a denormalized
 * Sanity field — the Edit modal moves the item between titleRow bands.
 */

export interface TitleRowItem extends GridItemBase {
  kind: "titleRow";
  label: LocaleString;
  /**
   * Explicit section band height in rows (title + content). When set, vacancy
   * blanks fill up to this height; when omitted, the band hugs content.
   */
  sectionRows?: number;
  /** When true, public homepage omits this titleRow and its band. Admin still shows it. */
  hidden?: boolean;
}

export interface ColorCellItem extends GridItemBase {
  kind: "colorCell";
  fill: CellFill;
  href?: string;
  label?: LocaleString;
  /**
   * Optional long text (poetry / prose). Omitted by default — only present
   * when an editor adds it; clear in admin to remove from the public cell.
   */
  prose?: LocaleString;
}

/** Content card stack: meta → title → image → description */
export interface MediaCellItem extends GridItemBase {
  kind: "mediaCell";
  meta?: LocaleString;
  title?: LocaleString;
  caption?: LocaleString;
  description?: LocaleString;
  /** Original resource URL (public click-through). */
  href?: string;
  imageSrc?: string;
  imageAlt?: LocaleString;
  placeholderTone?: PlaceholderTone;
}

export interface TextCellItem extends GridItemBase {
  kind: "textCell";
  meta?: LocaleString;
  headline: LocaleString;
  subtitle?: LocaleString;
  excerpt?: LocaleString;
  /** Original resource URL (public click-through). */
  href?: string;
  imageSrc?: string;
  imageAlt?: LocaleString;
  placeholderTone?: PlaceholderTone;
}

export interface ProjectCellItem extends GridItemBase {
  kind: "projectCell";
  meta?: LocaleString;
  title: LocaleString;
  subtitle?: LocaleString;
  year?: string;
  summary?: LocaleString;
  href?: string;
  imageSrc?: string;
  imageAlt?: LocaleString;
  placeholderTone?: PlaceholderTone;
}

/** Empty spacer — holds vacated grid cells so later sections don’t reflow up. */
export interface BlankCellItem extends GridItemBase {
  kind: "blankCell";
}

export type GridItem =
  | TitleRowItem
  | ColorCellItem
  | MediaCellItem
  | TextCellItem
  | ProjectCellItem
  | BlankCellItem;
