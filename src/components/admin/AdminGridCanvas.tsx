"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GridCell } from "@/components/grid/GridCell";
import { gridPlacementStyle, sortGridItems } from "@/lib/grid";
import type { GridItem } from "@/types/grid";

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

interface AdminGridCanvasProps {
  items: GridItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AdminGridCanvas({
  items,
  selectedId,
  onSelect,
}: AdminGridCanvasProps) {
  const sorted = sortGridItems(items);

  return (
    <section
      className="homepage-grid lines-active mx-auto w-full max-w-[90rem] px-4 pb-16 sm:px-6 md:px-8"
      aria-label="Admin homepage grid canvas"
    >
      <p className="mb-3 font-mono text-[0.65rem] tracking-[0.16em] text-ink/45 uppercase">
        Drag any block to reorder · click to select
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminSortableCell({
  item,
  selected,
  onSelect,
}: {
  item: GridItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gridDndId(item.id) });

  const style = {
    ...gridPlacementStyle(item),
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-sortable-cell${selected ? " is-selected" : ""}${
        isDragging ? " is-dragging" : ""
      }`}
      data-kind={item.kind}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <span className="admin-sortable-cell__grip" aria-hidden>
        ⋮⋮
      </span>
      <GridCell item={item} omitPlacement className="admin-sortable-cell__body" />
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
