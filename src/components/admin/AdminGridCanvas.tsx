"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GridCell } from "@/components/grid/GridCell";
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

export type GridResizePatch = Pick<GridItem, "colStart" | "colSpan" | "rowSpan">;

interface AdminGridCanvasProps {
  items: GridItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onResize: (id: string, patch: Partial<GridResizePatch>) => void;
}

export function AdminGridCanvas({
  items,
  selectedId,
  onSelect,
  onResize,
}: AdminGridCanvasProps) {
  const sorted = sortGridItems(items);

  return (
    <section
      className="homepage-grid lines-active mx-auto w-full max-w-[90rem] px-4 pb-16 sm:px-6 md:px-8"
      aria-label="Admin homepage grid canvas"
    >
      <p className="mb-3 font-mono text-[0.65rem] tracking-[0.16em] text-ink/45 uppercase">
        Drag to reorder · click to select · drag edges to resize
      </p>
      <div className="grid-canvas">
        <div className="grid-lines" aria-hidden style={{ opacity: 0.45 }} />
        <div className="staggered-grid">
          {sorted.map((item) => (
            <AdminSortableCell
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
              onResize={onResize}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type ResizeEdge = "e" | "s" | "se";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function AdminSortableCell({
  item,
  selected,
  onSelect,
  onResize,
}: {
  item: GridItem;
  selected: boolean;
  onSelect: () => void;
  onResize: (id: string, patch: Partial<GridResizePatch>) => void;
}) {
  const cellRef = useRef<HTMLDivElement | null>(null);
  const [resizing, setResizing] = useState(false);
  const resizeSession = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    colUnit: number;
    rowUnit: number;
    colStart: number;
    colSpan: number;
    rowSpan: number;
    lastKey: string;
  } | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: gridDndId(item.id),
    disabled: resizing,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      cellRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  // With DragOverlay, keep the source cell parked — transforming it with the
  // pointer makes closestCenter always hit `active` so drops never reorder.
  const style = {
    ...gridPlacementStyle(item),
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition:
      isDragging || resizing ? undefined : transition,
  };

  const canResizeCols = item.kind !== "titleRow";

  useEffect(() => {
    if (!resizing) return;

    function onPointerMove(event: PointerEvent) {
      const session = resizeSession.current;
      if (!session) return;

      const patch: Partial<GridResizePatch> = {};
      let colStart = session.colStart;
      let colSpan = session.colSpan;
      let rowSpan = session.rowSpan;

      if (session.edge === "e" || session.edge === "se") {
        const dx = event.clientX - session.startX;
        const deltaCols = Math.round(dx / session.colUnit);
        const maxSpan = GRID_COLUMNS - session.colStart + 1;
        colSpan = clamp(session.colSpan + deltaCols, 1, maxSpan);
        // Keep in bounds: colStart + colSpan ≤ 5
        if (colStart + colSpan - 1 > GRID_COLUMNS) {
          colStart = Math.max(1, GRID_COLUMNS - colSpan + 1);
        }
        patch.colStart = colStart;
        patch.colSpan = colSpan;
      }

      if (session.edge === "s" || session.edge === "se") {
        const dy = event.clientY - session.startY;
        const deltaRows = Math.round(dy / session.rowUnit);
        rowSpan = clamp(session.rowSpan + deltaRows, 1, 4);
        patch.rowSpan = rowSpan;
      }

      const key = `${patch.colStart ?? ""}-${patch.colSpan ?? ""}-${patch.rowSpan ?? ""}`;
      if (key === session.lastKey) return;
      session.lastKey = key;
      onResize(item.id, patch);
    }

    function endResize() {
      resizeSession.current = null;
      setResizing(false);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("pointercancel", endResize);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endResize);
      window.removeEventListener("pointercancel", endResize);
    };
  }, [resizing, item.id, onResize]);

  function beginResize(edge: ResizeEdge, event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (edge !== "s" && !canResizeCols) return;

    const el = cellRef.current;
    if (!el) return;
    const grid = el.closest(".staggered-grid");
    const gridWidth = grid?.clientWidth || el.offsetWidth;
    const colUnit = gridWidth / GRID_COLUMNS;
    const rowSpan = item.rowSpan ?? 1;
    const rowUnit = Math.max(48, el.offsetHeight / Math.max(1, rowSpan));

    resizeSession.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      colUnit: Math.max(24, colUnit),
      rowUnit,
      colStart: item.colStart,
      colSpan: item.colSpan,
      rowSpan,
      lastKey: "",
    };
    setResizing(true);
    onSelect();
  }

  return (
    <div
      ref={setRefs}
      style={style}
      className={`admin-sortable-cell${selected ? " is-selected" : ""}${
        isDragging ? " is-dragging" : ""
      }${resizing ? " is-resizing" : ""}`}
      data-kind={item.kind}
      data-dnd-id={gridDndId(item.id)}
      onClick={onSelect}
      {...attributes}
      {...(resizing ? {} : listeners)}
    >
      <span className="admin-sortable-cell__grip" aria-hidden>
        ⋮⋮
      </span>
      <GridCell
        item={item}
        omitPlacement
        /* is-inview: public grid reveals via IntersectionObserver; admin has none */
        className="admin-sortable-cell__body is-inview"
      />
      {selected && !isDragging ? (
        <>
          {canResizeCols ? (
            <button
              type="button"
              aria-label="Resize width"
              className="admin-resize-handle admin-resize-handle--e"
              onPointerDown={(event) => beginResize("e", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          <button
            type="button"
            aria-label="Resize height"
            className="admin-resize-handle admin-resize-handle--s"
            onPointerDown={(event) => beginResize("s", event)}
            onClick={(event) => event.stopPropagation()}
          />
          {canResizeCols ? (
            <button
              type="button"
              aria-label="Resize width and height"
              className="admin-resize-handle admin-resize-handle--se"
              onPointerDown={(event) => beginResize("se", event)}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          <span className="admin-resize-badge" aria-hidden>
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
