"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { flushSync } from "react-dom";
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
import { duplicateGridItem, normalizeGridItems } from "@/lib/grid-normalize";
import { reorderGridItems } from "@/lib/grid-reorder";
import { applyGridResize } from "@/lib/grid-resize";
import {
  compactAllSections,
  compactSection,
  measureSectionBand,
  MAX_SECTION_ROWS,
  packGridSectioned,
  sectionIndexRange,
  setSectionRowCount,
} from "@/lib/grid-layout";
import {
  addGridItem,
  contentSectionOf,
  listContentSections,
  moveItemToContentSection,
  type SectionTarget,
} from "@/lib/grid-section";
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
  "blankCell",
];

const FILLS: CellFill[] = ["rust", "ochre", "sage", "tan", "paper", "ink"];

type SaveState = "idle" | "saving" | "saved" | "error";
type DataSource = "sanity" | "fixture";
type SidebarTab = "blocks" | "section" | "placement" | "content";

const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
  { id: "blocks", label: "Blocks" },
  { id: "section", label: "Section" },
  { id: "placement", label: "Placement" },
  { id: "content", label: "Content" },
];

interface AdminGridAppProps {
  initialItems: GridItem[];
  initialSource?: DataSource;
}

const HISTORY_CAP = 40;

function cloneItems(items: GridItem[]): GridItem[] {
  return structuredClone(normalizeGridItems(items));
}

/** Stable compare for dirty detection (ignore ephemeral blank id churn if equal layout). */
function gridSignature(items: GridItem[]): string {
  return JSON.stringify(
    normalizeGridItems(items).map((item) => {
      const { id, order, ...rest } = item;
      // Keep id for content cells; blanks are keyed by placement only.
      if (item.kind === "blankCell") {
        return {
          kind: "blankCell",
          colStart: item.colStart,
          colSpan: item.colSpan,
          rowSpan: item.rowSpan ?? 1,
          rowStart: item.rowStart ?? null,
        };
      }
      return { id, order, ...rest };
    }),
  );
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
  const [contentOpen, setContentOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("blocks");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [dirtyTick, setDirtyTick] = useState(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const savedItemsRef = useRef(cloneItems(initialItems));
  const pastRef = useRef<GridItem[][]>([]);
  const futureRef = useRef<GridItem[][]>([]);
  const resizeHistoryArmed = useRef(true);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  void historyTick;
  const isDirty = useMemo(() => {
    void dirtyTick;
    return gridSignature(items) !== gridSignature(savedItemsRef.current);
  }, [items, dirtyTick]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    setContentOpen(false);
  }, [selectedId]);

  // Lock the document to the admin viewport — scroll lives in sidebar/preview panes.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  const activeDragItem = useMemo(() => {
    if (!activeDragId) return null;
    return items.find((item) => item.id === activeDragId) ?? null;
  }, [activeDragId, items]);

  /** Sidebar omits vacancy spacers — they clutter the list without aiding edit. */
  const listItems = useMemo(
    () => items.filter((item) => item.kind !== "blankCell"),
    [items],
  );
  const listSortableIds = useMemo(
    () => listItems.map((item) => listDndId(item.id)),
    [listItems],
  );
  const gridSortableIds = useMemo(
    () => items.map((item) => gridDndId(item.id)),
    [items],
  );

  const persist = useCallback(async (next: GridItem[]) => {
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
      // Keep optimistic draft layout; mark this snapshot as last published.
      const published = normalizeGridItems(data.items ?? next);
      savedItemsRef.current = cloneItems(published);
      if (data.source) setSource(data.source);
      setSaveState("saved");
      setDirtyTick((tick) => tick + 1);
      // Soft-refresh RSC so Open public / hard navigation sees new data.
      router.refresh();
    } catch {
      setSaveState("error");
    }
  }, [router]);

  const pushHistory = useCallback((snapshot: GridItem[]) => {
    pastRef.current = [...pastRef.current, cloneItems(snapshot)].slice(
      -HISTORY_CAP,
    );
    futureRef.current = [];
    setHistoryTick((tick) => tick + 1);
  }, []);

  const commitItems = useCallback(
    (
      updater: (prev: GridItem[]) => GridItem[],
      options?: { recordHistory?: boolean },
    ) => {
      const prev = itemsRef.current;
      const next = normalizeGridItems(updater(prev));
      if (options?.recordHistory !== false) {
        pushHistory(prev);
      }
      itemsRef.current = next;
      setItems(next);
      setSaveState("idle");
      setDirtyTick((tick) => tick + 1);
      return next;
    },
    [pushHistory],
  );

  const saveDraft = useCallback(() => {
    void persist(itemsRef.current);
  }, [persist]);

  const discardDraft = useCallback(() => {
    const previous = cloneItems(savedItemsRef.current);
    pushHistory(itemsRef.current);
    itemsRef.current = previous;
    setItems(previous);
    setSelectedId((current) =>
      current && previous.some((item) => item.id === current)
        ? current
        : (previous[0]?.id ?? null),
    );
    setPreviewKey((key) => key + 1);
    setSaveState("idle");
    setDirtyTick((tick) => tick + 1);
  }, [pushHistory]);

  const updateItems = useCallback(
    (updater: (prev: GridItem[]) => GridItem[]) => {
      commitItems(updater, { recordHistory: true });
    },
    [commitItems],
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [
      ...futureRef.current,
      cloneItems(itemsRef.current),
    ].slice(-HISTORY_CAP);
    itemsRef.current = previous;
    setItems(previous);
    setSelectedId((current) =>
      current && previous.some((item) => item.id === current)
        ? current
        : (previous[0]?.id ?? null),
    );
    setHistoryTick((tick) => tick + 1);
    setPreviewKey((key) => key + 1);
    setSaveState("idle");
    setDirtyTick((tick) => tick + 1);
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;
    const next = future[future.length - 1];
    futureRef.current = future.slice(0, -1);
    pastRef.current = [
      ...pastRef.current,
      cloneItems(itemsRef.current),
    ].slice(-HISTORY_CAP);
    itemsRef.current = next;
    setItems(next);
    setSelectedId((current) =>
      current && next.some((item) => item.id === current)
        ? current
        : (next[0]?.id ?? null),
    );
    setHistoryTick((tick) => tick + 1);
    setPreviewKey((key) => key + 1);
    setSaveState("idle");
    setDirtyTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key === "Escape" && !contentOpen) {
        setSelectedId(null);
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, contentOpen]);

  function onDragStart(event: DragStartEvent) {
    const id = parseAnyDndId(event.active.id);
    setActiveDragId(id);
    if (id) setSelectedId(id);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !sameSurface(active.id, over.id)) {
      setActiveDragId(null);
      return;
    }
    const activeId = parseAnyDndId(active.id);
    const overId = parseAnyDndId(over.id);
    if (!activeId || !overId || activeId === overId) {
      setActiveDragId(null);
      return;
    }

    // Commit new CSS-grid placement before DragOverlay / isDragging tear down
    // so the source never paints one frame at the old slot (snap-back).
    flushSync(() => {
      updateItems((prev) => reorderGridItems(prev, activeId, overId));
    });
    setActiveDragId(null);
  }

  function onDragCancel() {
    setActiveDragId(null);
  }

  function resizeItem(
    id: string,
    patch: Partial<
      Pick<GridItem, "colStart" | "colSpan" | "rowSpan" | "rowStart">
    >,
    options?: { recordHistory?: boolean },
  ) {
    commitItems((prev) => applyGridResize(prev, id, patch), {
      recordHistory: options?.recordHistory !== false,
    });
  }

  function onCanvasResizeStart() {
    if (!resizeHistoryArmed.current) return;
    pushHistory(itemsRef.current);
    resizeHistoryArmed.current = false;
  }

  function onCanvasResizeEnd() {
    resizeHistoryArmed.current = true;
  }

  function addItem() {
    updateItems((prev) => {
      const result = addGridItem(prev, addKind, selectedId);
      setSelectedId(result.selectedId);
      return result.items;
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
        "Reset grid to seed fixtures and publish to Sanity (or .data fallback)?",
      )
    ) {
      return;
    }
    pushHistory(itemsRef.current);
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
    itemsRef.current = next;
    savedItemsRef.current = cloneItems(next);
    setItems(next);
    setSelectedId(next[0]?.id ?? null);
    if (data.source) setSource(data.source);
    setSaveState("saved");
    setDirtyTick((tick) => tick + 1);
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
      ? "Publishing…"
      : saveState === "error"
        ? "Save failed"
        : isDirty
          ? "Unsaved changes"
          : saveState === "saved"
            ? source === "sanity"
              ? "Published · Sanity"
              : "Published · .data"
            : source === "sanity"
              ? "Draft · Sanity"
              : "Draft · fixture";

  const selectedHandlers = selected
    ? {
        onResize: (
          patch: Partial<
            Pick<GridItem, "colStart" | "colSpan" | "rowSpan" | "rowStart">
          >,
        ) => resizeItem(selected.id, patch, { recordHistory: true }),
        onFeaturedChange: (featured: boolean) => {
          updateItems((prev) => {
            const current = prev.find((row) => row.id === selected.id);
            if (!current) return prev;
            const colStart =
              featured && current.colStart > 3 ? 3 : current.colStart;
            const resized = applyGridResize(prev, selected.id, {
              colStart,
              colSpan: featured ? 2 : 1,
            });
            return resized.map((row) =>
              row.id === selected.id
                ? ({
                    ...row,
                    featured: featured || undefined,
                  } as GridItem)
                : row,
            );
          });
        },
        onSectionRowsChange: (rows: number) => {
          updateItems((prev) => setSectionRowCount(prev, selected.id, rows));
        },
        onCompactSection: () => {
          updateItems((prev) => compactSection(prev, selected.id));
        },
        onDuplicate: duplicateSelected,
        onRemove: removeSelected,
      }
    : null;

  return (
    <div className="admin-shell flex h-dvh max-h-dvh flex-col overflow-hidden">
      <header className="admin-shell__header flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-4 py-3 sm:px-6">
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
          <a
            href="/studio"
            target="_blank"
            rel="noreferrer"
            className="border border-ink/20 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
          >
            Studio
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
        <div className="admin-shell__body grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:grid-rows-1">
          <aside className="admin-sidebar flex min-h-0 flex-col border-b border-ink/15 lg:border-r lg:border-b-0">
            <div
              className="admin-sidebar__tabs shrink-0"
              role="tablist"
              aria-label="Grid editing panels"
              onKeyDown={(event) => {
                const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                const i = SIDEBAR_TABS.findIndex((t) => t.id === sidebarTab);
                let next = i;
                if (event.key === "ArrowRight") {
                  next = (i + 1) % SIDEBAR_TABS.length;
                } else if (event.key === "ArrowLeft") {
                  next =
                    (i - 1 + SIDEBAR_TABS.length) % SIDEBAR_TABS.length;
                } else if (event.key === "Home") {
                  next = 0;
                } else if (event.key === "End") {
                  next = SIDEBAR_TABS.length - 1;
                }
                const tab = SIDEBAR_TABS[next];
                if (!tab) return;
                setSidebarTab(tab.id);
                requestAnimationFrame(() => {
                  document.getElementById(`admin-tab-${tab.id}`)?.focus();
                });
              }}
            >
              {SIDEBAR_TABS.map((tab) => {
                const active = sidebarTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    id={`admin-tab-${tab.id}`}
                    aria-controls={`admin-panel-${tab.id}`}
                    onClick={() => setSidebarTab(tab.id)}
                    className={`admin-sidebar__tab font-mono text-[0.62rem] tracking-[0.14em] uppercase${
                      active ? " is-active" : ""
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="admin-sidebar__panels min-h-0 flex-1 overflow-hidden">
              {sidebarTab === "blocks" ? (
                <div
                  id="admin-panel-blocks"
                  role="tabpanel"
                  aria-labelledby="admin-tab-blocks"
                  className="flex h-full min-h-0 flex-col"
                >
                  <div className="space-y-1.5 shrink-0 border-b border-ink/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={addKind}
                        onChange={(e) =>
                          setAddKind(e.target.value as GridItemKind)
                        }
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
                    <p className="font-mono text-[0.55rem] tracking-[0.1em] text-ink/40 uppercase">
                      {selectedId
                        ? "Fills the selected cell in place"
                        : "No selection · new section at bottom"}
                    </p>
                  </div>
                  <SortableContext
                    items={listSortableIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="min-h-0 flex-1 overflow-y-auto">
                      {listItems.map((item) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          active={item.id === selectedId}
                          onSelect={() => setSelectedId(item.id)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </div>
              ) : null}

              {sidebarTab === "section" ? (
                <div
                  id="admin-panel-section"
                  role="tabpanel"
                  aria-labelledby="admin-tab-section"
                  className="h-full min-h-0 overflow-y-auto p-4"
                >
                  {selected && selectedHandlers ? (
                    <SectionTab
                      item={selected}
                      items={items}
                      onSectionRowsChange={selectedHandlers.onSectionRowsChange}
                      onCompactSection={selectedHandlers.onCompactSection}
                    />
                  ) : (
                    <p className="text-sm text-ink/50">
                      Select a block to edit its section size.
                    </p>
                  )}
                </div>
              ) : null}

              {sidebarTab === "placement" ? (
                <div
                  id="admin-panel-placement"
                  role="tabpanel"
                  aria-labelledby="admin-tab-placement"
                  className="h-full min-h-0 overflow-y-auto p-4"
                >
                  {selected && selectedHandlers ? (
                    <PlacementTab
                      item={selected}
                      onResize={selectedHandlers.onResize}
                      onFeaturedChange={selectedHandlers.onFeaturedChange}
                      onDuplicate={selectedHandlers.onDuplicate}
                      onRemove={selectedHandlers.onRemove}
                    />
                  ) : (
                    <p className="text-sm text-ink/50">
                      Select a block to edit placement.
                    </p>
                  )}
                </div>
              ) : null}

              {sidebarTab === "content" ? (
                <div
                  id="admin-panel-content"
                  role="tabpanel"
                  aria-labelledby="admin-tab-content"
                  className="h-full min-h-0 overflow-y-auto p-4"
                >
                  {selected ? (
                    <ContentTab
                      item={selected}
                      onOpenEdit={() => setContentOpen(true)}
                    />
                  ) : (
                    <p className="text-sm text-ink/50">
                      Select a block to view content summary.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </aside>

          <section className="admin-shell__preview flex min-h-0 min-w-0 flex-col bg-paper/40">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink/50 uppercase">
                  Live preview · draft until Save
                </p>
                <p className="text-xs text-ink/45">
                  Edits stay local until{" "}
                  <span className="font-mono uppercase">Save</span> publishes to{" "}
                  <code className="font-mono">
                    {source === "sanity"
                      ? "Sanity homepage.gridItems"
                      : ".data/ (fallback)"}
                  </code>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    title="Undo (⌘Z / Ctrl+Z)"
                    className="border border-ink/20 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    title="Redo (⌘⇧Z / Ctrl+Shift+Z)"
                    className="border border-ink/20 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Redo
                  </button>
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => setContentOpen(true)}
                    className="border border-ink/20 px-4 py-2 font-mono text-[0.7rem] tracking-[0.16em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateItems((prev) => compactAllSections(prev))
                    }
                    title="Trim blank rows in every section — content defines height"
                    className="border border-ink/20 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
                  >
                    Compact all
                  </button>
                  <button
                    type="button"
                    onClick={discardDraft}
                    disabled={!isDirty || saveState === "saving"}
                    title="Revert draft to last saved publish"
                    className="border border-ink/20 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={!isDirty || saveState === "saving"}
                    title="Publish draft to the public site"
                    className="bg-rust px-4 py-2 font-mono text-[0.7rem] tracking-[0.16em] text-paper uppercase disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-paper/70"
                  >
                    {saveState === "saving" ? "Saving…" : "Save"}
                  </button>
                </div>
                <p
                  className={`font-mono text-[0.55rem] tracking-[0.12em] uppercase ${
                    isDirty || saveState === "error"
                      ? "text-rust"
                      : "text-ink/40"
                  }`}
                >
                  {statusLabel}
                  {selected ? ` · ${itemContentPreview(selected)}` : ""}
                </p>
              </div>
            </div>
            <div
              className="admin-preview min-h-0 flex-1 overflow-auto p-3 sm:p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedId(null);
              }}
            >
              <div
                className="admin-preview__stage origin-top"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setSelectedId(null);
                }}
              >
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
                    onResizeStart={onCanvasResizeStart}
                    onResizeEnd={onCanvasResizeEnd}
                    onResize={(id, patch) =>
                      resizeItem(id, patch, { recordHistory: false })
                    }
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

      {contentOpen && selected ? (
        <ContentEditModal
          item={selected}
          sections={listContentSections(items)}
          currentSectionId={contentSectionOf(items, selected.id)?.titleId ?? null}
          onApply={(patch, sectionTarget) => {
            updateItems((prev) => {
              let next = prev;
              if (sectionTarget) {
                next = moveItemToContentSection(
                  next,
                  selected.id,
                  sectionTarget,
                );
              }
              if (Object.keys(patch).length === 0) return next;
              return next.map((row) =>
                row.id === selected.id
                  ? ({ ...row, ...patch } as GridItem)
                  : row,
              );
            });
            setContentOpen(false);
          }}
          onClose={() => setContentOpen(false)}
        />
      ) : null}
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
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: listDndId(item.id),
      animateLayoutChanges: () => false,
      transition: null,
    });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: undefined,
    opacity: isDragging ? 0 : undefined,
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
            : item.kind === "blankCell"
              ? "Spacer"
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
  if (item.kind === "blankCell") return "Spacer";
  return item.title || item.caption || "Media";
}

function SectionTab({
  item,
  items,
  onSectionRowsChange,
  onCompactSection,
}: {
  item: GridItem;
  items: GridItem[];
  onSectionRowsChange: (rows: number) => void;
  onCompactSection: () => void;
}) {
  const range = sectionIndexRange(items, item.id);
  const packed = packGridSectioned(items);
  const band = range ? measureSectionBand(items, range, packed) : null;
  const head = range ? items[range.start] : null;
  const sectionLabel =
    head?.kind === "titleRow" ? head.label || "Section" : "Section";

  return (
    <div className="space-y-3">
      <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
        {sectionLabel}
      </p>
      {band ? (
        <div className="space-y-2">
          <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
            Section size · {band.sectionRows} rows (content {band.contentHeight})
          </p>
          <NumberField
            label="Section rows"
            value={band.sectionRows}
            min={band.contentHeight}
            max={MAX_SECTION_ROWS}
            onChange={onSectionRowsChange}
          />
          <p className="text-xs text-ink/45">
            Grow adds empty target rows; shrink removes trailing blanks. Cannot
            go below content height.
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink/50">No section metrics for this block.</p>
      )}
      <button
        type="button"
        onClick={onCompactSection}
        className="border border-ink/20 px-2 py-1.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase"
        title="Trim trailing blank rows in this section"
      >
        Compact section
      </button>
    </div>
  );
}

function PlacementTab({
  item,
  onResize,
  onFeaturedChange,
  onDuplicate,
  onRemove,
}: {
  item: GridItem;
  onResize: (
    patch: Partial<
      Pick<GridItem, "colStart" | "colSpan" | "rowSpan" | "rowStart">
    >,
  ) => void;
  onFeaturedChange: (featured: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const maxSpan = GRID_COLUMNS - item.colStart + 1;

  return (
    <div className="space-y-3">
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
            onResize({ colStart, colSpan });
          }}
          disabled={item.kind === "titleRow"}
        />
        <NumberField
          label="colSpan"
          value={item.colSpan}
          min={1}
          max={maxSpan}
          onChange={(colSpan) => onResize({ colSpan })}
          disabled={item.kind === "titleRow"}
        />
        <NumberField
          label="rowSpan"
          value={item.rowSpan ?? 1}
          min={1}
          max={4}
          onChange={(rowSpan) => onResize({ rowSpan })}
        />
      </div>

      {item.kind === "mediaCell" ||
      item.kind === "textCell" ||
      item.kind === "projectCell" ? (
        <label className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.12em] text-ink uppercase">
          <input
            type="checkbox"
            checked={Boolean(item.featured)}
            onChange={(e) => onFeaturedChange(e.target.checked)}
            className="accent-rust"
          />
          Featured lead · span 2
        </label>
      ) : null}
    </div>
  );
}

function ContentTab({
  item,
  onOpenEdit,
}: {
  item: GridItem;
  onOpenEdit: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
        Content · {item.kind}
      </p>
      <p className="text-sm text-ink">{itemContentPreview(item)}</p>
      {"href" in item && item.href ? (
        <p className="break-all font-mono text-[0.6rem] tracking-[0.08em] text-ink/50">
          Link · {item.href}
        </p>
      ) : item.kind !== "blankCell" && item.kind !== "titleRow" ? (
        <p className="text-xs text-ink/40">No link URL yet</p>
      ) : null}
      {item.kind === "blankCell" ? (
        <p className="text-xs text-ink/45">
          Empty spacer — drop/resize target inside the section band. Compact to
          trim unused rows.
        </p>
      ) : (
        <>
          <p className="text-xs text-ink/45">
            Use <span className="font-mono uppercase">Edit</span> in the preview
            bar (or below) to change inner content.
          </p>
          <button
            type="button"
            onClick={onOpenEdit}
            className="bg-rust px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase"
          >
            Edit content
          </button>
        </>
      )}
    </div>
  );
}

const NEW_SECTION_VALUE = "__new__";

function ContentEditModal({
  item,
  sections,
  currentSectionId,
  onApply,
  onClose,
}: {
  item: GridItem;
  sections: { titleId: string; label: string }[];
  currentSectionId: string | null;
  onApply: (patch: Partial<GridItem>, sectionTarget?: SectionTarget) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<GridItem>(() => structuredClone(item));
  const [sectionChoice, setSectionChoice] = useState(
    () => currentSectionId ?? NEW_SECTION_VALUE,
  );
  const [newSectionLabel, setNewSectionLabel] = useState("New section");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(structuredClone(item));
    setSectionChoice(currentSectionId ?? NEW_SECTION_VALUE);
    setNewSectionLabel("New section");
  }, [item, currentSectionId]);

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

  function resolveSectionTarget(): SectionTarget | undefined {
    if (item.kind === "titleRow") return undefined;
    if (sectionChoice === NEW_SECTION_VALUE) {
      return { type: "new", label: newSectionLabel };
    }
    if (currentSectionId && sectionChoice === currentSectionId) {
      return undefined;
    }
    return { type: "existing", titleId: sectionChoice };
  }

  function apply() {
    const sectionTarget = resolveSectionTarget();

    if (draft.kind === "blankCell") {
      if (sectionTarget) onApply({}, sectionTarget);
      else onClose();
      return;
    }
    if (draft.kind === "titleRow") {
      onApply({ label: draft.label });
      return;
    }
    if (draft.kind === "colorCell") {
      onApply({ fill: draft.fill, label: draft.label }, sectionTarget);
      return;
    }
    if (draft.kind === "mediaCell") {
      onApply(
        {
          meta: draft.meta,
          title: draft.title,
          caption: draft.caption,
          imageSrc: draft.imageSrc,
          imageAlt: draft.imageAlt,
          placeholderTone: draft.placeholderTone,
          description: draft.description,
        },
        sectionTarget,
      );
      return;
    }
    if (draft.kind === "textCell") {
      onApply(
        {
          meta: draft.meta,
          headline: draft.headline,
          subtitle: draft.subtitle,
          imageSrc: draft.imageSrc,
          imageAlt: draft.imageAlt,
          placeholderTone: draft.placeholderTone,
          excerpt: draft.excerpt,
        },
        sectionTarget,
      );
      return;
    }
    onApply(
      {
        meta: draft.meta,
        title: draft.title,
        subtitle: draft.subtitle,
        year: draft.year,
        imageSrc: draft.imageSrc,
        imageAlt: draft.imageAlt,
        placeholderTone: draft.placeholderTone,
        summary: draft.summary,
      },
      sectionTarget,
    );
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
          {draft.kind !== "titleRow" ? (
            <div className="space-y-2">
              <SelectField
                label="Content section"
                value={sectionChoice}
                options={[
                  ...sections.map((section) => ({
                    value: section.titleId,
                    label: section.label,
                  })),
                  { value: NEW_SECTION_VALUE, label: "New section…" },
                ]}
                onChange={setSectionChoice}
              />
              {sectionChoice === NEW_SECTION_VALUE ? (
                <TextField
                  label="New section name"
                  value={newSectionLabel}
                  onChange={setNewSectionLabel}
                />
              ) : null}
            </div>
          ) : null}

          {draft.kind === "blankCell" ? (
            <p className="text-sm text-ink/60">
              Empty spacer — no content fields. Use placement controls or resize
              handles to change size, or remove the block. Change content section
              above to move this spacer into another band.
            </p>
          ) : null}

          {draft.kind === "titleRow" ? (
            <TextField
              label="Content section"
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
              <TextField
                label="Link URL"
                value={draft.href ?? ""}
                onChange={(href) => patchDraft({ href } as Partial<GridItem>)}
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
              <ImagePickerField
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
              <TextField
                label="Link URL"
                value={draft.href ?? ""}
                onChange={(href) => patchDraft({ href } as Partial<GridItem>)}
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
              <ImagePickerField
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
              <TextField
                label="Link URL"
                value={draft.href ?? ""}
                onChange={(href) => patchDraft({ href } as Partial<GridItem>)}
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
              <ImagePickerField
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
              <TextField
                label="Link URL"
                value={draft.href ?? ""}
                onChange={(href) => patchDraft({ href } as Partial<GridItem>)}
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

function ImagePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(false);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as { src?: string; error?: string };
      if (!res.ok || !data.src) {
        throw new Error(data.error || "Upload failed");
      }
      onChange(data.src);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] tracking-[0.08em] text-ink/55 uppercase">
        Image
      </p>
      <div className="admin-image-picker">
        <div className="admin-image-picker__preview">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="admin-image-picker__img" />
          ) : (
            <p className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/40 uppercase">
              No image
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void onFileChange(event)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="bg-ink px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase disabled:opacity-50"
          >
            {uploading ? "Uploading…" : value ? "Replace image" : "Choose image"}
          </button>
          {value ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => onChange("")}
              className="border border-ink/20 px-3 py-1.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowPath((open) => !open)}
            className="self-start font-mono text-[0.55rem] tracking-[0.12em] text-ink/45 uppercase"
          >
            {showPath ? "Hide path" : "Advanced path"}
          </button>
          {showPath ? (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/media/…"
              className="w-full border border-ink/15 bg-paper px-2 py-1.5 font-mono text-[0.7rem] text-ink/70"
            />
          ) : value ? (
            <p className="truncate font-mono text-[0.6rem] text-ink/40">
              {value}
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-rust" role="alert">
              {error}
            </p>
          ) : null}
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
  options: Array<string | { value: string; label: string }>;
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
        {options.map((option) => {
          const opt =
            typeof option === "string"
              ? { value: option, label: option }
              : option;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
