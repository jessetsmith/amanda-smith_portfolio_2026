"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CellFill, GridItem, GridItemKind } from "@/types/grid";
import { GRID_COLUMNS } from "@/types/grid";
import {
  createGridItem,
  duplicateGridItem,
  normalizeGridItems,
} from "@/lib/grid-normalize";
import { reorderGridItems } from "@/lib/grid-reorder";
import { IntroBand } from "@/components/IntroBand";
import {
  AdminDragOverlayCard,
  AdminGridCanvas,
  GRID_DND_PREFIX,
  gridDndId,
  parseGridDndId,
} from "@/components/admin/AdminGridCanvas";

const LIST_DND_PREFIX = "list:" as const;

function listDndId(id: string): string {
  return `${LIST_DND_PREFIX}${id}`;
}

function parseListDndId(dndId: string | number): string | null {
  const raw = String(dndId);
  if (!raw.startsWith(LIST_DND_PREFIX)) return null;
  return raw.slice(LIST_DND_PREFIX.length);
}

function parseAnyDndId(dndId: string | number): string | null {
  return parseGridDndId(dndId) ?? parseListDndId(dndId);
}

function sameSurface(a: string | number, b: string | number): boolean {
  const left = String(a);
  const right = String(b);
  const leftGrid = left.startsWith(GRID_DND_PREFIX);
  const rightGrid = right.startsWith(GRID_DND_PREFIX);
  const leftList = left.startsWith(LIST_DND_PREFIX);
  const rightList = right.startsWith(LIST_DND_PREFIX);
  return (leftGrid && rightGrid) || (leftList && rightList);
}

/** Prefer pointer hits; never treat the active node as its own drop target. */
const adminCollisionDetection: CollisionDetection = (args) => {
  const containers = args.droppableContainers.filter(
    (container) => container.id !== args.active.id,
  );
  const scoped = { ...args, droppableContainers: containers };

  const pointerHits = pointerWithin(scoped).filter((hit) =>
    sameSurface(args.active.id, hit.id),
  );
  if (pointerHits.length > 0) return pointerHits;

  const rectHits = rectIntersection(scoped).filter((hit) =>
    sameSurface(args.active.id, hit.id),
  );
  if (rectHits.length > 0) return rectHits;

  return closestCenter(scoped).filter((hit) =>
    sameSurface(args.active.id, hit.id),
  );
};

const KINDS: GridItemKind[] = [
  "titleRow",
  "colorCell",
  "mediaCell",
  "textCell",
  "projectCell",
];

const FILLS: CellFill[] = ["rust", "ochre", "sage", "tan", "paper", "ink"];

type SaveState = "idle" | "saving" | "saved" | "error";
type DataSource = "sanity" | "fixture";

interface AdminGridAppProps {
  initialItems: GridItem[];
  initialSource?: DataSource;
}

export function AdminGridApp({
  initialItems,
  initialSource = "fixture",
}: AdminGridAppProps) {
  const router = useRouter();
  const [items, setItems] = useState(() => normalizeGridItems(initialItems));
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );
  const [addKind, setAddKind] = useState<GridItemKind>("textCell");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [source, setSource] = useState<DataSource>(initialSource);
  const [previewKey, setPreviewKey] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const activeDragItem = useMemo(() => {
    if (!activeDragId) return null;
    return items.find((item) => item.id === activeDragId) ?? null;
  }, [activeDragId, items]);

  const listSortableIds = useMemo(
    () => items.map((item) => listDndId(item.id)),
    [items],
  );
  const gridSortableIds = useMemo(
    () => items.map((item) => gridDndId(item.id)),
    [items],
  );

  const persist = useCallback(
    async (next: GridItem[]) => {
      setSaveState("saving");
      try {
        const res = await fetch("/api/homepage-grid", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: next }),
        });
        if (!res.ok) throw new Error("save failed");
        const data = (await res.json()) as {
          items: GridItem[];
          source?: DataSource;
        };
        // Prefer the payload we saved — avoid clobbering optimistic reorder
        // with a momentarily-stale Sanity read.
        setItems(normalizeGridItems(next));
        if (data.source) setSource(data.source);
        setSaveState("saved");
        router.refresh();
      } catch {
        setSaveState("error");
      }
    },
    [router],
  );

  const updateItems = useCallback(
    (updater: (prev: GridItem[]) => GridItem[]) => {
      setItems((prev) => {
        const next = normalizeGridItems(updater(prev));
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void persist(next);
        }, 400);
        return next;
      });
    },
    [persist],
  );

  function onDragStart(event: DragStartEvent) {
    const id = parseAnyDndId(event.active.id);
    setActiveDragId(id);
    if (id) setSelectedId(id);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    if (!sameSurface(active.id, over.id)) return;
    const activeId = parseAnyDndId(active.id);
    const overId = parseAnyDndId(over.id);
    if (!activeId || !overId || activeId === overId) return;
    updateItems((prev) => reorderGridItems(prev, activeId, overId));
  }

  function onDragCancel() {
    setActiveDragId(null);
  }

  function patchSelected(patch: Partial<GridItem>) {
    if (!selectedId) return;
    updateItems((prev) =>
      prev.map((item) =>
        item.id === selectedId ? ({ ...item, ...patch } as GridItem) : item,
      ),
    );
  }

  function addItem() {
    updateItems((prev) => {
      const created = createGridItem(addKind, prev.length + 1);
      setSelectedId(created.id);
      return [...prev, created];
    });
  }

  function duplicateSelected() {
    if (!selected) return;
    updateItems((prev) => {
      const index = prev.findIndex((item) => item.id === selected.id);
      const copy = duplicateGridItem(selected, index + 2);
      setSelectedId(copy.id);
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function removeSelected() {
    if (!selected) return;
    updateItems((prev) => {
      const next = prev.filter((item) => item.id !== selected.id);
      setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }

  async function resetToSeed() {
    if (
      !confirm(
        "Reset grid to seed fixtures and write to Sanity (or .data fallback)?",
      )
    ) {
      return;
    }
    setSaveState("saving");
    const res = await fetch("/api/homepage-grid", { method: "DELETE" });
    if (!res.ok) {
      setSaveState("error");
      return;
    }
    const data = (await res.json()) as {
      items: GridItem[];
      source?: DataSource;
    };
    const next = normalizeGridItems(data.items);
    setItems(next);
    setSelectedId(next[0]?.id ?? null);
    if (data.source) setSource(data.source);
    setSaveState("saved");
    setPreviewKey((k) => k + 1);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const statusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? source === "sanity"
          ? "Saved to Sanity"
          : "Saved to .data (fallback)"
        : saveState === "error"
          ? "Save failed"
          : source === "sanity"
            ? "Ready · Sanity"
            : "Ready · fixture";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.2em] text-rust uppercase">
            Portfolio 2026
          </p>
          <h1 className="font-display text-xl tracking-tight text-ink">
            Grid admin
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.65rem] tracking-[0.12em] text-ink/50 uppercase">
            {statusLabel}
          </span>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="border border-ink/20 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
          >
            Open public
          </a>
          <button
            type="button"
            onClick={() => void resetToSeed()}
            className="border border-ink/20 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
          >
            Reset seed
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="bg-ink px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase"
          >
            Log out
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={adminCollisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="grid flex-1 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
          <aside className="border-b border-ink/15 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-2 border-b border-ink/10 px-4 py-3">
              <select
                value={addKind}
                onChange={(e) => setAddKind(e.target.value as GridItemKind)}
                className="flex-1 border border-ink/20 bg-paper px-2 py-1.5 font-mono text-xs"
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addItem}
                className="bg-rust px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase"
              >
                Add
              </button>
            </div>

            <SortableContext
              items={listSortableIds}
              strategy={verticalListSortingStrategy}
            >
              <ul className="max-h-[36vh] overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    active={item.id === selectedId}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </ul>
            </SortableContext>

            {selected ? (
              <ItemFields
                item={selected}
                onChange={patchSelected}
                onDuplicate={duplicateSelected}
                onRemove={removeSelected}
              />
            ) : (
              <p className="p-4 text-sm text-ink/50">
                Select or drag a cell in the preview to edit.
              </p>
            )}
          </aside>

          <section className="min-w-0 bg-paper/40">
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
              <div>
                <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink/50 uppercase">
                  Live preview · drag blocks to reorder
                </p>
                <p className="text-xs text-ink/45">
                  Drop on another cell to change{" "}
                  <code className="font-mono">order</code> · saves to{" "}
                  <code className="font-mono">
                    {source === "sanity"
                      ? "Sanity homepage.gridItems"
                      : ".data/ (fallback)"}
                  </code>
                </p>
              </div>
            </div>
            <div className="admin-preview max-h-[calc(100vh-7rem)] overflow-auto p-3 sm:p-4">
              <div className="admin-preview__stage origin-top">
                <IntroBand />
                <SortableContext
                  items={gridSortableIds}
                  strategy={rectSortingStrategy}
                >
                  <AdminGridCanvas
                    key={previewKey}
                    items={items}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </SortableContext>
              </div>
            </div>
          </section>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            <AdminDragOverlayCard item={activeDragItem} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableRow({
  item,
  active,
  onSelect,
}: {
  item: GridItem;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: listDndId(item.id) });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  const label =
    item.kind === "titleRow"
      ? item.label
      : item.kind === "textCell"
        ? item.headline
        : item.kind === "projectCell"
          ? item.title
          : item.kind === "colorCell"
            ? item.label || item.fill
            : item.caption || "Media";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch border-b border-ink/10 ${
        active ? "bg-tan/35" : "bg-transparent"
      } ${isDragging ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab px-2 font-mono text-ink/40 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ::
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-2 py-2.5 text-left"
      >
        <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
          {item.kind}
          {item.featured ? " · lead" : ""} · c{item.colStart}/{item.colSpan} · r
          {item.rowSpan ?? 1}
        </p>
        <p className="truncate text-sm text-ink">{label}</p>
      </button>
    </li>
  );
}

function itemContentPreview(item: GridItem): string {
  if (item.kind === "titleRow") return item.label;
  if (item.kind === "colorCell") return item.label || item.fill;
  if (item.kind === "textCell") return item.headline;
  if (item.kind === "projectCell") return item.title;
  return item.title || item.caption || "Media";
}

function ItemFields({
  item,
  onChange,
  onDuplicate,
  onRemove,
}: {
  item: GridItem;
  onChange: (patch: Partial<GridItem>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const maxSpan = GRID_COLUMNS - item.colStart + 1;
  const [contentOpen, setContentOpen] = useState(false);

  useEffect(() => {
    setContentOpen(false);
  }, [item.id]);

  return (
    <div className="space-y-3 border-t border-ink/15 p-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDuplicate}
          className="border border-ink/20 px-2 py-1 font-mono text-[0.6rem] tracking-[0.12em] uppercase"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="border border-rust/40 px-2 py-1 font-mono text-[0.6rem] tracking-[0.12em] text-rust uppercase"
        >
          Remove
        </button>
      </div>

      <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
        Placement · {item.kind}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="colStart"
          value={item.colStart}
          min={1}
          max={GRID_COLUMNS}
          onChange={(colStart) => {
            const colSpan = Math.min(item.colSpan, GRID_COLUMNS - colStart + 1);
            onChange({ colStart, colSpan } as Partial<GridItem>);
          }}
          disabled={item.kind === "titleRow"}
        />
        <NumberField
          label="colSpan"
          value={item.colSpan}
          min={1}
          max={maxSpan}
          onChange={(colSpan) => onChange({ colSpan } as Partial<GridItem>)}
          disabled={item.kind === "titleRow"}
        />
        <NumberField
          label="rowSpan"
          value={item.rowSpan ?? 1}
          min={1}
          max={4}
          onChange={(rowSpan) => onChange({ rowSpan } as Partial<GridItem>)}
        />
      </div>

      {item.kind === "mediaCell" ||
      item.kind === "textCell" ||
      item.kind === "projectCell" ? (
        <label className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.12em] text-ink uppercase">
          <input
            type="checkbox"
            checked={Boolean(item.featured)}
            onChange={(e) =>
              onChange({
                featured: e.target.checked || undefined,
              } as Partial<GridItem>)
            }
            className="accent-rust"
          />
          Featured lead
        </label>
      ) : null}

      <div className="space-y-2 border border-ink/12 bg-paper/60 p-3">
        <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
          Content
        </p>
        <p className="truncate text-sm text-ink">{itemContentPreview(item)}</p>
        <button
          type="button"
          onClick={() => setContentOpen(true)}
          className="bg-ink px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase"
        >
          Edit
        </button>
      </div>

      {contentOpen ? (
        <ContentEditModal
          item={item}
          onApply={(patch) => {
            onChange(patch);
            setContentOpen(false);
          }}
          onClose={() => setContentOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ContentEditModal({
  item,
  onApply,
  onClose,
}: {
  item: GridItem;
  onApply: (patch: Partial<GridItem>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<GridItem>(() => structuredClone(item));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(structuredClone(item));
  }, [item]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("input, textarea, select")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function patchDraft(patch: Partial<GridItem>) {
    setDraft((prev) => ({ ...prev, ...patch } as GridItem));
  }

  function apply() {
    if (draft.kind === "titleRow") {
      onApply({ label: draft.label });
      return;
    }
    if (draft.kind === "colorCell") {
      onApply({ fill: draft.fill, label: draft.label });
      return;
    }
    if (draft.kind === "mediaCell") {
      onApply({
        meta: draft.meta,
        title: draft.title,
        caption: draft.caption,
        imageSrc: draft.imageSrc,
        imageAlt: draft.imageAlt,
        placeholderTone: draft.placeholderTone,
        description: draft.description,
      });
      return;
    }
    if (draft.kind === "textCell") {
      onApply({
        meta: draft.meta,
        headline: draft.headline,
        subtitle: draft.subtitle,
        imageSrc: draft.imageSrc,
        imageAlt: draft.imageAlt,
        placeholderTone: draft.placeholderTone,
        excerpt: draft.excerpt,
      });
      return;
    }
    onApply({
      meta: draft.meta,
      title: draft.title,
      subtitle: draft.subtitle,
      year: draft.year,
      imageSrc: draft.imageSrc,
      imageAlt: draft.imageAlt,
      placeholderTone: draft.placeholderTone,
      summary: draft.summary,
    });
  }

  return (
    <div
      className="admin-content-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-content-modal-title"
        className="admin-content-modal__panel"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/12 pb-3">
          <div>
            <p className="font-mono text-[0.6rem] tracking-[0.16em] text-rust uppercase">
              Edit content
            </p>
            <h2
              id="admin-content-modal-title"
              className="mt-1 font-display text-xl tracking-tight text-ink"
            >
              {item.kind}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-ink/20 px-2 py-1 font-mono text-[0.6rem] tracking-[0.12em] uppercase"
          >
            Close
          </button>
        </div>

        <div className="admin-content-modal__fields space-y-3 py-4">
          {draft.kind === "titleRow" ? (
            <TextField
              label="Label"
              value={draft.label}
              onChange={(label) => patchDraft({ label } as Partial<GridItem>)}
            />
          ) : null}

          {draft.kind === "colorCell" ? (
            <>
              <SelectField
                label="Fill"
                value={draft.fill}
                options={FILLS}
                onChange={(fill) =>
                  patchDraft({ fill: fill as CellFill } as Partial<GridItem>)
                }
              />
              <TextField
                label="Label"
                value={draft.label ?? ""}
                onChange={(label) => patchDraft({ label } as Partial<GridItem>)}
              />
            </>
          ) : null}

          {draft.kind === "mediaCell" ? (
            <>
              <TextField
                label="Meta"
                value={draft.meta ?? ""}
                onChange={(meta) => patchDraft({ meta } as Partial<GridItem>)}
              />
              <TextField
                label="Title"
                value={draft.title ?? ""}
                onChange={(title) => patchDraft({ title } as Partial<GridItem>)}
              />
              <TextField
                label="Caption"
                value={draft.caption ?? ""}
                onChange={(caption) =>
                  patchDraft({ caption } as Partial<GridItem>)
                }
              />
              <TextField
                label="Image URL"
                value={draft.imageSrc ?? ""}
                onChange={(imageSrc) =>
                  patchDraft({ imageSrc } as Partial<GridItem>)
                }
              />
              <SelectField
                label="Image tone"
                value={draft.placeholderTone ?? "warm"}
                options={["warm", "cool", "ink"]}
                onChange={(placeholderTone) =>
                  patchDraft({ placeholderTone } as Partial<GridItem>)
                }
              />
              <TextAreaField
                label="Description"
                value={draft.description ?? ""}
                onChange={(description) =>
                  patchDraft({ description } as Partial<GridItem>)
                }
              />
            </>
          ) : null}

          {draft.kind === "textCell" ? (
            <>
              <TextField
                label="Meta"
                value={draft.meta ?? ""}
                onChange={(meta) => patchDraft({ meta } as Partial<GridItem>)}
              />
              <TextField
                label="Title"
                value={draft.headline}
                onChange={(headline) =>
                  patchDraft({ headline } as Partial<GridItem>)
                }
              />
              <TextField
                label="Subtitle"
                value={draft.subtitle ?? ""}
                onChange={(subtitle) =>
                  patchDraft({ subtitle } as Partial<GridItem>)
                }
              />
              <TextField
                label="Image URL"
                value={draft.imageSrc ?? ""}
                onChange={(imageSrc) =>
                  patchDraft({ imageSrc } as Partial<GridItem>)
                }
              />
              <SelectField
                label="Image tone"
                value={draft.placeholderTone ?? "warm"}
                options={["warm", "cool", "ink"]}
                onChange={(placeholderTone) =>
                  patchDraft({ placeholderTone } as Partial<GridItem>)
                }
              />
              <TextAreaField
                label="Description"
                value={draft.excerpt ?? ""}
                onChange={(excerpt) =>
                  patchDraft({ excerpt } as Partial<GridItem>)
                }
              />
            </>
          ) : null}

          {draft.kind === "projectCell" ? (
            <>
              <TextField
                label="Meta"
                value={draft.meta ?? ""}
                onChange={(meta) => patchDraft({ meta } as Partial<GridItem>)}
              />
              <TextField
                label="Title"
                value={draft.title}
                onChange={(title) => patchDraft({ title } as Partial<GridItem>)}
              />
              <TextField
                label="Subtitle"
                value={draft.subtitle ?? ""}
                onChange={(subtitle) =>
                  patchDraft({ subtitle } as Partial<GridItem>)
                }
              />
              <TextField
                label="Year"
                value={draft.year ?? ""}
                onChange={(year) => patchDraft({ year } as Partial<GridItem>)}
              />
              <TextField
                label="Image URL"
                value={draft.imageSrc ?? ""}
                onChange={(imageSrc) =>
                  patchDraft({ imageSrc } as Partial<GridItem>)
                }
              />
              <SelectField
                label="Image tone"
                value={draft.placeholderTone ?? "cool"}
                options={["warm", "cool", "ink"]}
                onChange={(placeholderTone) =>
                  patchDraft({ placeholderTone } as Partial<GridItem>)
                }
              />
              <TextAreaField
                label="Description"
                value={draft.summary ?? ""}
                onChange={(summary) =>
                  patchDraft({ summary } as Partial<GridItem>)
                }
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-ink/12 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-ink/20 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] uppercase"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="bg-rust px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-[0.65rem] tracking-[0.08em] text-ink/55 uppercase">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full border border-ink/20 bg-paper px-2 py-1.5 font-mono text-sm text-ink disabled:opacity-40"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-[0.65rem] tracking-[0.08em] text-ink/55 uppercase">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-ink/20 bg-paper px-2 py-1.5 text-sm text-ink"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-[0.65rem] tracking-[0.08em] text-ink/55 uppercase">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full border border-ink/20 bg-paper px-2 py-1.5 text-sm text-ink"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-[0.65rem] tracking-[0.08em] text-ink/55 uppercase">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-ink/20 bg-paper px-2 py-1.5 font-mono text-sm text-ink"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
