"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GridCell } from "@/components/grid/GridCell";
import { packGridSectioned } from "@/lib/grid-layout";
import { gridPlacementStyle, sortGridItems } from "@/lib/grid";
import { GRID_COLUMNS, type GridItem } from "@/types/grid";

/** Prefix so list + canvas can both be sortable without id collisions. */
export const GRID_DND_PREFIX = "grid:" as const;

export function gridDndId(id: string): string {
  return `${GRID_DND_PREFIX}${id}`;
}

export function parseGridDndId(dndId: string | number): string | null {
  const raw = String(dndId);
  if (!raw.startsWith(GRID_DND_PREFIX)) return null;
  return raw.slice(GRID_DND_PREFIX.length);
}

export type GridResizePatch = Pick<
  GridItem,
  "colStart" | "colSpan" | "rowSpan" | "rowStart"
>;

interface AdminGridCanvasProps {
  items: GridItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onResize: (id: string, patch: Partial<GridResizePatch>) => void;
}

export function AdminGridCanvas({
  items,
  selectedId,
  onSelect,
  onResizeStart,
  onResizeEnd,
  onResize,
}: AdminGridCanvasProps) {
  const sorted = sortGridItems(items);
  const packed = useMemo(() => packGridSectioned(items), [items]);
  const sectionRowBounds = useMemo(() => {
    const bounds = new Map<string, { min: number; max: number }>();
    for (const item of items) {
      const geom = packed.get(item.id);
      if (!geom) continue;
      // Section key = nearest preceding titleRow id, or "__preamble__"
      let titleId = "__preamble__";
      const idx = items.findIndex((row) => row.id === item.id);
      for (let i = idx; i >= 0; i -= 1) {
        if (items[i].kind === "titleRow") {
          titleId = items[i].id;
          break;
        }
      }
      const end = geom.row + geom.h - 1;
      const prev = bounds.get(titleId);
      if (!prev) {
        bounds.set(titleId, { min: geom.row, max: end });
      } else {
        bounds.set(titleId, {
          min: Math.min(prev.min, geom.row),
          max: Math.max(prev.max, end),
        });
      }
    }
    return bounds;
  }, [items, packed]);

  return (
    <section
      className="homepage-grid lines-active mx-auto w-full max-w-[90rem] px-4 pb-16 sm:px-6 md:px-8"
      aria-label="Admin homepage grid canvas"
    >
      <p className="mb-3 font-mono text-[0.65rem] tracking-[0.16em] text-ink/45 uppercase">
        Click to select · ⋮⋮ grip to reorder · edge handles to resize
      </p>
      <div className="grid-canvas">
        <div className="grid-lines" aria-hidden style={{ opacity: 0.45 }} />
        <div className="staggered-grid">
          {sorted.map((item) => {
            const geom = packed.get(item.id);
            const colEnd = item.colStart + item.colSpan - 1;
            const atLeftEdge = item.kind === "titleRow" || item.colStart <= 1;
            const atRightEdge =
              item.kind === "titleRow" || colEnd >= GRID_COLUMNS;
            let titleId = "__preamble__";
            let sectionHidden = false;
            const idx = items.findIndex((row) => row.id === item.id);
            for (let i = idx; i >= 0; i -= 1) {
              const row = items[i];
              if (row.kind === "titleRow") {
                titleId = row.id;
                sectionHidden = Boolean(row.hidden);
                break;
              }
            }
            const band = sectionRowBounds.get(titleId);
            const rowEnd = geom ? geom.row + geom.h - 1 : 0;
            const atTopEdge = Boolean(
              geom && band && geom.row <= band.min,
            );
            const atBottomEdge = Boolean(
              geom && band && rowEnd >= band.max && band.max > 0,
            );

            return (
              <AdminSortableCell
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                sectionHidden={sectionHidden}
                atLeftEdge={atLeftEdge}
                atRightEdge={atRightEdge}
                atTopEdge={atTopEdge}
                atBottomEdge={atBottomEdge}
                packedRow={geom?.row ?? item.rowStart ?? 1}
                onSelect={() => onSelect(item.id)}
                onResizeStart={onResizeStart}
                onResizeEnd={onResizeEnd}
                onResize={onResize}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

type ResizeEdge = "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function AdminSortableCell({
  item,
  selected,
  sectionHidden,
  atLeftEdge,
  atRightEdge,
  atTopEdge,
  atBottomEdge,
  packedRow,
  onSelect,
  onResizeStart,
  onResizeEnd,
  onResize,
}: {
  item: GridItem;
  selected: boolean;
  sectionHidden: boolean;
  atLeftEdge: boolean;
  atRightEdge: boolean;
  atTopEdge: boolean;
  atBottomEdge: boolean;
  packedRow: number;
  onSelect: () => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onResize: (id: string, patch: Partial<GridResizePatch>) => void;
}) {
  const cellRef = useRef<HTMLDivElement | null>(null);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const onResizeStartRef = useRef(onResizeStart);
  onResizeStartRef.current = onResizeStart;
  const onResizeEndRef = useRef(onResizeEnd);
  onResizeEndRef.current = onResizeEnd;
  const itemRef = useRef(item);
  itemRef.current = item;
  const packedRowRef = useRef(packedRow);
  packedRowRef.current = packedRow;
  const [resizing, setResizing] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: gridDndId(item.id),
      disabled: resizing,
      // CSS grid owns placement — sortable layout animations cause snap-back.
      animateLayoutChanges: () => false,
      transition: null,
    });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      cellRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  // Park source under DragOverlay (no pointer transform). Hide it fully so
  // drop never flashes the old grid slot before optimistic placement paints.
  const style = {
    ...gridPlacementStyle(item),
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: undefined,
    opacity: isDragging ? 0 : undefined,
  };

  const canResizeCols = item.kind !== "titleRow";
  // Center: all sides. On an outer boundary: omit the crushed side only.
  const showE = canResizeCols && !atRightEdge;
  const showW = canResizeCols && !atLeftEdge;
  const showS = !atBottomEdge;
  const showN = !atTopEdge;
  const showSE = showE && showS;
  const showSW = showW && showS;
  const showNE = showE && showN;
  const showNW = showW && showN;
  const gripLeft = atRightEdge && !atLeftEdge;

  function beginResize(
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    // Keep dnd-kit / cell handlers from seeing this gesture.
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const touchesCols =
      edge === "e" ||
      edge === "w" ||
      edge === "se" ||
      edge === "sw" ||
      edge === "ne" ||
      edge === "nw";
    if (touchesCols && !canResizeCols) return;

    const el = cellRef.current;
    if (!el) return;
    const current = itemRef.current;
    const grid = el.closest(".staggered-grid");
    const gridWidth = grid?.clientWidth || el.offsetWidth;
    const colUnit = Math.max(24, gridWidth / GRID_COLUMNS);
    const startRowSpan = current.rowSpan ?? 1;
    const rowUnit = Math.max(48, el.offsetHeight / Math.max(1, startRowSpan));

    const session = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      colUnit,
      rowUnit,
      colStart: current.colStart,
      colSpan: current.colSpan,
      rowSpan: startRowSpan,
      rowStart: packedRowRef.current,
      lastKey: "",
      pointerId: event.pointerId,
    };

    setResizing(true);
    onSelect();
    onResizeStartRef.current?.();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    function onPointerMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== session.pointerId) return;
      moveEvent.preventDefault();

      const patch: Partial<GridResizePatch> = {};
      let colStart = session.colStart;
      let colSpan = session.colSpan;
      let rowSpan = session.rowSpan;
      let rowStart = session.rowStart;

      const resizeEast =
        session.edge === "e" ||
        session.edge === "se" ||
        session.edge === "ne";
      const resizeWest =
        session.edge === "w" ||
        session.edge === "sw" ||
        session.edge === "nw";
      const resizeSouth =
        session.edge === "s" ||
        session.edge === "se" ||
        session.edge === "sw";
      const resizeNorth =
        session.edge === "n" ||
        session.edge === "ne" ||
        session.edge === "nw";

      if (resizeEast) {
        const dx = moveEvent.clientX - session.startX;
        const deltaCols = Math.round(dx / session.colUnit);
        const maxSpan = GRID_COLUMNS - session.colStart + 1;
        colSpan = clamp(session.colSpan + deltaCols, 1, maxSpan);
        colStart = session.colStart;
        patch.colStart = colStart;
        patch.colSpan = colSpan;
      } else if (resizeWest) {
        // Keep the right edge fixed; adjust colStart + colSpan together.
        const dx = moveEvent.clientX - session.startX;
        const deltaCols = Math.round(dx / session.colUnit);
        const endCol = session.colStart + session.colSpan - 1;
        colStart = clamp(session.colStart + deltaCols, 1, endCol);
        colSpan = endCol - colStart + 1;
        patch.colStart = colStart;
        patch.colSpan = colSpan;
      }

      if (resizeSouth) {
        const dy = moveEvent.clientY - session.startY;
        const deltaRows = Math.round(dy / session.rowUnit);
        rowSpan = clamp(session.rowSpan + deltaRows, 1, 4);
        rowStart = session.rowStart;
        patch.rowSpan = rowSpan;
        patch.rowStart = rowStart;
      } else if (resizeNorth) {
        // Keep the bottom edge fixed; adjust rowStart + rowSpan together.
        const dy = moveEvent.clientY - session.startY;
        const deltaRows = Math.round(dy / session.rowUnit);
        const endRow = session.rowStart + session.rowSpan - 1;
        const minRow = Math.max(1, endRow - 4 + 1);
        rowStart = clamp(session.rowStart + deltaRows, minRow, endRow);
        rowSpan = endRow - rowStart + 1;
        patch.rowSpan = rowSpan;
        patch.rowStart = rowStart;
      }

      const key = `${patch.colStart ?? ""}-${patch.colSpan ?? ""}-${patch.rowSpan ?? ""}-${patch.rowStart ?? ""}`;
      if (key === session.lastKey) return;
      session.lastKey = key;
      onResizeRef.current(current.id, patch);
    }

    function endResize(endEvent: PointerEvent) {
      if (endEvent.pointerId !== session.pointerId) return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endResize);
      window.removeEventListener("pointercancel", endResize);
      setResizing(false);
      onResizeEndRef.current?.();
    }

    // Attach immediately — do not wait for a useEffect after setState.
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("pointercancel", endResize);
  }

  return (
    <div
      ref={setRefs}
      style={style}
      className={`admin-sortable-cell${selected ? " is-selected" : ""}${
        isDragging ? " is-dragging" : ""
      }${resizing ? " is-resizing" : ""}${
        sectionHidden ? " is-section-hidden" : ""
      }${atLeftEdge ? " is-left-edge" : ""}${
        atRightEdge ? " is-right-edge" : ""
      }${atTopEdge ? " is-top-edge" : ""}${
        atBottomEdge ? " is-bottom-edge" : ""
      }`}
      data-kind={item.kind}
      data-section-hidden={sectionHidden ? "true" : undefined}
      data-dnd-id={gridDndId(item.id)}
      onClick={() => onSelect()}
    >
      {/* Drag only from grip — leaves edges free for resize handles */}
      <button
        type="button"
        className={`admin-sortable-cell__grip${
          gripLeft ? " admin-sortable-cell__grip--left" : ""
        }`}
        aria-label="Drag to reorder"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      {sectionHidden && item.kind === "titleRow" ? (
        <span className="admin-section-hidden-badge" aria-hidden>
          Hidden
        </span>
      ) : null}
      <GridCell
        item={item}
        omitPlacement
        enableLinks={false}
        /* is-inview: public grid reveals via IntersectionObserver; admin has none */
        className="admin-sortable-cell__body is-inview"
      />
      {selected && !isDragging ? (
        <>
          {showE ? (
            <button
              type="button"
              aria-label="Resize width from right"
              className="admin-resize-handle admin-resize-handle--e"
              onPointerDown={(event) => beginResize("e", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {showW ? (
            <button
              type="button"
              aria-label="Resize width from left"
              className="admin-resize-handle admin-resize-handle--w"
              onPointerDown={(event) => beginResize("w", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {showS ? (
            <button
              type="button"
              aria-label="Resize height from bottom"
              className="admin-resize-handle admin-resize-handle--s"
              onPointerDown={(event) => beginResize("s", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {showN ? (
            <button
              type="button"
              aria-label="Resize height from top"
              className="admin-resize-handle admin-resize-handle--n"
              onPointerDown={(event) => beginResize("n", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {showSE ? (
            <button
              type="button"
              aria-label="Resize from bottom-right"
              className="admin-resize-handle admin-resize-handle--se"
              onPointerDown={(event) => beginResize("se", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {showSW ? (
            <button
              type="button"
              aria-label="Resize from bottom-left"
              className="admin-resize-handle admin-resize-handle--sw"
              onPointerDown={(event) => beginResize("sw", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {showNE ? (
            <button
              type="button"
              aria-label="Resize from top-right"
              className="admin-resize-handle admin-resize-handle--ne"
              onPointerDown={(event) => beginResize("ne", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {showNW ? (
            <button
              type="button"
              aria-label="Resize from top-left"
              className="admin-resize-handle admin-resize-handle--nw"
              onPointerDown={(event) => beginResize("nw", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          <span
            className={`admin-resize-badge${
              atBottomEdge ? " admin-resize-badge--top" : ""
            }`}
            aria-hidden
          >
            c{item.colSpan} · r{item.rowSpan ?? 1}
          </span>
        </>
      ) : null}
    </div>
  );
}

export function AdminDragOverlayCard({ item }: { item: GridItem }) {
  const label =
    item.kind === "titleRow"
      ? item.label
      : item.kind === "textCell"
        ? item.headline
        : item.kind === "projectCell"
          ? item.title
          : item.kind === "colorCell"
            ? item.label || item.fill
            : item.kind === "blankCell"
              ? "Spacer"
              : item.title || item.caption || "Media";

  return (
    <div className="admin-drag-overlay">
      <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/50 uppercase">
        {item.kind}
        {item.featured ? " · lead" : ""}
      </p>
      <p className="font-display text-lg leading-tight text-ink">{label}</p>
    </div>
  );
}
