export type CellFill = "rust" | "ochre" | "sage" | "tan" | "paper" | "ink";

export type PlaceholderTone = "warm" | "cool" | "ink";

export type GridItemKind =
  | "titleRow"
  | "colorCell"
  | "mediaCell"
  | "textCell"
  | "projectCell";

/** Homepage grid is max 4 columns. Spans are 1–4. */
export const GRID_COLUMNS = 4 as const;

export interface GridItemBase {
  id: string;
  order: number;
  kind: GridItemKind;
  /** 1-based column start on the 4-col grid */
  colStart: number;
  /** Width in columns (1–4) */
  colSpan: number;
  rowSpan?: number;
  fill?: CellFill;
  /**
   * Section lead / highlighted card. Prefer one featured content cell
   * immediately after each titleRow (near-full width + larger type/image).
   */
  featured?: boolean;
}

export interface TitleRowItem extends GridItemBase {
  kind: "titleRow";
  label: string;
}

export interface ColorCellItem extends GridItemBase {
  kind: "colorCell";
  fill: CellFill;
  href?: string;
  label?: string;
}

/** Content card stack: meta → title → image → description */
export interface MediaCellItem extends GridItemBase {
  kind: "mediaCell";
  meta?: string;
  title?: string;
  caption?: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  placeholderTone?: PlaceholderTone;
}

export interface TextCellItem extends GridItemBase {
  kind: "textCell";
  meta?: string;
  headline: string;
  subtitle?: string;
  excerpt?: string;
  imageSrc?: string;
  imageAlt?: string;
  placeholderTone?: PlaceholderTone;
}

export interface ProjectCellItem extends GridItemBase {
  kind: "projectCell";
  meta?: string;
  title: string;
  subtitle?: string;
  year?: string;
  summary?: string;
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
  placeholderTone?: PlaceholderTone;
}

export type GridItem =
  | TitleRowItem
  | ColorCellItem
  | MediaCellItem
  | TextCellItem
  | ProjectCellItem;
