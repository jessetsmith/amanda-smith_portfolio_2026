export type CellFill = "rust" | "ochre" | "sage" | "tan" | "paper" | "ink";

export type GridItemKind =
  | "titleRow"
  | "colorCell"
  | "mediaCell"
  | "textCell"
  | "projectCell";

export interface GridItemBase {
  id: string;
  order: number;
  kind: GridItemKind;
  /** 1-based column start on the 12-col grid */
  colStart: number;
  colSpan: number;
  rowSpan?: number;
  fill?: CellFill;
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

export interface MediaCellItem extends GridItemBase {
  kind: "mediaCell";
  caption?: string;
  /** Placeholder tone until real media lands */
  placeholderTone?: "warm" | "cool" | "ink";
}

export interface TextCellItem extends GridItemBase {
  kind: "textCell";
  headline: string;
  excerpt?: string;
  meta?: string;
}

export interface ProjectCellItem extends GridItemBase {
  kind: "projectCell";
  title: string;
  year?: string;
  summary?: string;
  href?: string;
}

export type GridItem =
  | TitleRowItem
  | ColorCellItem
  | MediaCellItem
  | TextCellItem
  | ProjectCellItem;
