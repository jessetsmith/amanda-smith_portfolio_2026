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
import type {
  CellFill,
  CellTextSize,
  GridItem,
  GridItemKind,
  LayoutBreakpoint,
  TitleRowItem,
} from "@/types/grid";
import { CELL_TEXT_SIZES } from "@/types/grid";
import { AdminLocaleSelect, readLocaleField, writeLocaleField } from "@/components/admin/AdminLocaleSelect";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { enOf } from "@/lib/i18n/display";
import { DEFAULT_LOCALE, type LocaleCode } from "@/lib/i18n/locales";
import { toLocaleMap, type LocaleString } from "@/lib/i18n/resolve";
import {
  BREAKPOINT_COLUMNS,
  GRID_COLUMNS,
  LAYOUT_BREAKPOINTS,
} from "@/types/grid";
import {
  BREAKPOINT_LABEL,
  PREVIEW_FRAME_WIDTH,
  projectItemsForBreakpoint,
  reorderBreakpointLayouts,
  writeBreakpointPlacement,
} from "@/lib/grid-breakpoints";
import { formatColorCellMeta } from "@/lib/grid";
import { duplicateGridItem, normalizeGridItems } from "@/lib/grid-normalize";
import { reorderGridItems } from "@/lib/grid-reorder";
import { applyGridResize } from "@/lib/grid-resize";
import {
  clearItemToBlank,
  compactAllSections,
  compactSection,
  measureSectionBand,
  MAX_SECTION_ROWS,
  packGridSectioned,
  sectionIndexRange,
  setSectionRowCount,
} from "@/lib/grid-layout";
import {
  addContentSection,
  addGridItem,
  contentSectionOf,
  listContentSections,
  moveItemToContentSection,
  type SectionTarget,
} from "@/lib/grid-section";
import { HazyNav } from "@/components/HazyNav";
import { IntroMask } from "@/components/IntroMask";
import { defaultHero, heroSignature, normalizeHero } from "@/lib/hero";
import type { NavItem } from "@/types/content";
import type { HomepageHero } from "@/types/hero";
import {
  AdminDragOverlayCard,
  AdminGridCanvas,
  GRID_DND_PREFIX,
  gridDndId,
  parseGridDndId,
} from "@/components/admin/AdminGridCanvas";
import { ChangePasswordModal } from "@/components/admin/ChangePasswordModal";

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
type SidebarTab = "hero" | "blocks" | "section" | "content";

const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "blocks", label: "Blocks" },
  { id: "section", label: "Section" },
  { id: "content", label: "Content" },
];

interface AdminGridAppProps {
  initialItems: GridItem[];
  initialSource?: DataSource;
  initialHero?: HomepageHero;
  initialHeroSource?: DataSource;
  siteTitle?: LocaleString;
  siteNav?: NavItem[];
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
  initialHero,
  initialHeroSource = "fixture",
  siteTitle = { en: "Amanda Smith" },
  siteNav = [
    { label: { en: "Work" }, href: "/#grid" },
    { label: { en: "CV" }, href: "/cv" },
    { label: { en: "Research" }, href: "/#grid" },
    { label: { en: "Contact" }, href: "mailto:hello@example.com" },
  ],
}: AdminGridAppProps) {
  const router = useRouter();
  const [items, setItems] = useState(() => normalizeGridItems(initialItems));
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );
  const [addKind, setAddKind] = useState<GridItemKind>("textCell");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [source, setSource] = useState<DataSource>(initialSource);
  const [hero, setHero] = useState<HomepageHero>(() =>
    normalizeHero(initialHero ?? defaultHero()),
  );
  const [heroSource, setHeroSource] = useState<DataSource>(initialHeroSource);
  const [previewKey, setPreviewKey] = useState(0);
  const [contentOpen, setContentOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("blocks");
  const [editBreakpoint, setEditBreakpoint] =
    useState<LayoutBreakpoint>("desktop");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [dirtyTick, setDirtyTick] = useState(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const savedItemsRef = useRef(cloneItems(initialItems));
  const heroRef = useRef(hero);
  heroRef.current = hero;
  const savedHeroRef = useRef(normalizeHero(initialHero ?? defaultHero()));
  const pastRef = useRef<GridItem[][]>([]);
  const futureRef = useRef<GridItem[][]>([]);
  const resizeHistoryArmed = useRef(true);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  void historyTick;
  const isGridDirty = useMemo(() => {
    void dirtyTick;
    return gridSignature(items) !== gridSignature(savedItemsRef.current);
  }, [items, dirtyTick]);
  const isHeroDirty = useMemo(() => {
    void dirtyTick;
    return heroSignature(hero) !== heroSignature(savedHeroRef.current);
  }, [hero, dirtyTick]);
  const isDirty = isGridDirty || isHeroDirty;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  /** Canonical item (desktop placement + shared content + layout overrides). */
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

  /** Flat items for the active breakpoint (desktop = canonical; tablet/mobile projected). */
  const viewItems = useMemo(
    () => projectItemsForBreakpoint(items, editBreakpoint),
    [items, editBreakpoint],
  );
  const editColumns = BREAKPOINT_COLUMNS[editBreakpoint];
  const previewFrameWidth = PREVIEW_FRAME_WIDTH[editBreakpoint];

  const activeDragItem = useMemo(() => {
    if (!activeDragId) return null;
    return (
      viewItems.find((item) => item.id === activeDragId) ??
      items.find((item) => item.id === activeDragId) ??
      null
    );
  }, [activeDragId, viewItems, items]);

  /** Sidebar omits vacancy spacers — they clutter the list without aiding edit. */
  const listItems = useMemo(
    () => viewItems.filter((item) => item.kind !== "blankCell"),
    [viewItems],
  );
  const listSortableIds = useMemo(
    () => listItems.map((item) => listDndId(item.id)),
    [listItems],
  );
  const gridSortableIds = useMemo(
    () => viewItems.map((item) => gridDndId(item.id)),
    [viewItems],
  );

  /** Placement shown in sidebar for the active breakpoint. */
  const selectedView = useMemo(
    () => viewItems.find((item) => item.id === selectedId) ?? selected,
    [viewItems, selectedId, selected],
  );

  const persist = useCallback(async (next: GridItem[], nextHero: HomepageHero) => {
    setSaveState("saving");
    try {
      const gridDirty =
        gridSignature(next) !== gridSignature(savedItemsRef.current);
      const heroDirty =
        heroSignature(nextHero) !== heroSignature(savedHeroRef.current);

      const tasks: Promise<Response>[] = [];
      if (gridDirty) {
        tasks.push(
          fetch("/api/homepage-grid", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: next }),
          }),
        );
      }
      if (heroDirty) {
        tasks.push(
          fetch("/api/homepage-hero", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hero: nextHero }),
          }),
        );
      }
      if (tasks.length === 0) {
        setSaveState("saved");
        return;
      }

      const results = await Promise.all(tasks);
      if (results.some((res) => !res.ok)) throw new Error("save failed");

      if (gridDirty) {
        const gridRes = results[0];
        const data = (await gridRes.json()) as {
          items: GridItem[];
          source?: DataSource;
        };
        const published = normalizeGridItems(data.items ?? next);
        savedItemsRef.current = cloneItems(published);
        if (data.source) setSource(data.source);
      }
      if (heroDirty) {
        const heroRes = results[gridDirty ? 1 : 0];
        const data = (await heroRes.json()) as {
          hero: HomepageHero;
          source?: DataSource;
        };
        const publishedHero = normalizeHero(data.hero ?? nextHero);
        savedHeroRef.current = publishedHero;
        setHero(publishedHero);
        heroRef.current = publishedHero;
        if (data.source) setHeroSource(data.source);
      }

      setSaveState("saved");
      setDirtyTick((tick) => tick + 1);
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
    void persist(itemsRef.current, heroRef.current);
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
    const previousHero = normalizeHero(savedHeroRef.current);
    setHero(previousHero);
    heroRef.current = previousHero;
    setPreviewKey((key) => key + 1);
    setSaveState("idle");
    setDirtyTick((tick) => tick + 1);
  }, [pushHistory]);

  const patchHero = useCallback((patch: Partial<HomepageHero>) => {
    setHero((prev) => {
      const next = normalizeHero({ ...prev, ...patch });
      heroRef.current = next;
      return next;
    });
    setSaveState("idle");
    setDirtyTick((tick) => tick + 1);
  }, []);

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
    // Tablet/mobile only write layouts[bp] — desktop fields stay untouched.
    flushSync(() => {
      updateItems((prev) => {
        if (editBreakpoint === "desktop") {
          return reorderGridItems(prev, activeId, overId);
        }
        return reorderBreakpointLayouts(
          prev,
          editBreakpoint,
          activeId,
          overId,
        );
      });
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
    commitItems(
      (prev) => {
        if (editBreakpoint === "desktop") {
          return applyGridResize(prev, id, patch);
        }
        // Placement-only write into layouts[bp]; skip desktop blank refill.
        return writeBreakpointPlacement(prev, id, editBreakpoint, patch);
      },
      {
        recordHistory: options?.recordHistory !== false,
      },
    );
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

  /** New titleRow band with empty targets — desktop structure only (no layout overrides). */
  function addSection() {
    updateItems((prev) => {
      const currentSection = selectedId
        ? contentSectionOf(prev, selectedId)
        : null;
      const result = addContentSection(prev, {
        afterTitleId: currentSection?.titleId ?? null,
        label: "New section",
        sectionRows: 3,
      });
      setSelectedId(result.selectedId);
      setSidebarTab("section");
      return result.items;
    });
  }

  function renameSection(titleId: string, label: string) {
    updateItems((prev) =>
      prev.map((item) => {
        if (item.id !== titleId || item.kind !== "titleRow") return item;
        const nextLabel = label.trim() || "Section";
        return { ...item, label: { en: nextLabel } } as TitleRowItem;
      }),
    );
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

  function clearSelectedToBlank() {
    if (!selected) return;
    if (selected.kind === "titleRow" || selected.kind === "blankCell") return;
    updateItems((prev) => {
      const next = clearItemToBlank(prev, selected.id);
      setSelectedId((current) =>
        current && next.some((item) => item.id === current)
          ? current
          : (next.find((item) => item.kind !== "blankCell")?.id ?? null),
      );
      return next;
    });
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.kind === "titleRow") return;
    updateItems((prev) => {
      const next = prev.filter((item) => item.id !== selected.id);
      setSelectedId(
        next.find((item) => item.kind !== "blankCell")?.id ?? null,
      );
      return next;
    });
  }

  function setSectionHidden(hidden: boolean) {
    if (!selected) return;
    updateItems((prev) => {
      const range = sectionIndexRange(prev, selected.id);
      if (!range) return prev;
      const head = prev[range.start];
      if (head?.kind !== "titleRow") return prev;
      return prev.map((item): GridItem => {
        if (item.id !== head.id || item.kind !== "titleRow") return item;
        if (hidden) return { ...item, hidden: true };
        const { hidden: _drop, ...rest } = item as TitleRowItem & {
          hidden?: boolean;
        };
        return { ...rest, kind: "titleRow" as const };
      });
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
            : source === "sanity" || heroSource === "sanity"
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
            // Featured flag is shared content; desktop also widens the highlight cell.
            // Tablet/mobile must not rewrite desktop colSpan — only flip featured.
            if (editBreakpoint !== "desktop") {
              return prev.map((row) =>
                row.id === selected.id
                  ? ({
                      ...row,
                      featured: featured || undefined,
                    } as GridItem)
                  : row,
              );
            }
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
        onSectionHiddenChange: setSectionHidden,
        onDuplicate: duplicateSelected,
        onClearToBlank: clearSelectedToBlank,
        onRemove: removeSelected,
      }
    : null;

  const canClearSelected = Boolean(
    selected && selected.kind !== "titleRow" && selected.kind !== "blankCell",
  );
  const canRemoveSelected = Boolean(
    selected && selected.kind !== "titleRow",
  );

  return (
    <LocaleProvider>
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
            className="cursor-pointer border border-ink/20 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
          >
            Reset seed
          </button>
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="cursor-pointer border border-ink/20 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
          >
            Change password
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="cursor-pointer bg-ink px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-paper uppercase"
          >
            Log out
          </button>
        </div>
      </header>

      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />

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
              {sidebarTab === "hero" ? (
                <div
                  id="admin-panel-hero"
                  role="tabpanel"
                  aria-labelledby="admin-tab-hero"
                  className="h-full min-h-0 overflow-y-auto p-4"
                >
                  <HeroTab hero={hero} onChange={patchHero} />
                </div>
              ) : null}

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
                    <button
                      type="button"
                      onClick={addSection}
                      className="w-full cursor-pointer border border-ink/20 px-3 py-1.5 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
                      title="Add a new content section (title row + empty band)"
                    >
                      New section
                    </button>
                    <p className="font-mono text-[0.55rem] tracking-[0.1em] text-ink/40 uppercase">
                      {selectedId
                        ? "Add fills the selected cell · New section opens Section tab"
                        : "No selection · Add starts a section · or use New section"}
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
                  <div className="mb-5 space-y-2 border-b border-ink/12 pb-4">
                    <button
                      type="button"
                      onClick={addSection}
                      className="w-full cursor-pointer bg-rust px-4 py-2.5 font-mono text-[0.7rem] tracking-[0.16em] text-paper uppercase"
                      title={
                        selected
                          ? "Add a new section after the selected band"
                          : "Add a new section at the bottom of the grid"
                      }
                    >
                      Add section
                    </button>
                    <p className="font-mono text-[0.55rem] tracking-[0.1em] text-ink/40 uppercase">
                      {selected
                        ? "Inserts after the selected section · editable title · empty rows for blocks"
                        : "Appends at the bottom · editable title · empty rows for blocks"}
                    </p>
                  </div>
                  {selected && selectedView && selectedHandlers ? (
                    <SectionTab
                      item={selectedView}
                      items={items}
                      columns={editColumns}
                      breakpoint={editBreakpoint}
                      onSectionLabelChange={renameSection}
                      onSectionRowsChange={selectedHandlers.onSectionRowsChange}
                      onCompactSection={selectedHandlers.onCompactSection}
                      onSectionHiddenChange={
                        selectedHandlers.onSectionHiddenChange
                      }
                      onResize={selectedHandlers.onResize}
                      onFeaturedChange={selectedHandlers.onFeaturedChange}
                      onDuplicate={selectedHandlers.onDuplicate}
                      onRemove={selectedHandlers.onRemove}
                    />
                  ) : (
                    <p className="text-sm text-ink/50">
                      Select a block to edit that section’s name, visibility, and
                      placement — or add a section above.
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
            <div className="flex shrink-0 flex-col gap-2 border-b border-ink/10 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div
                  className="admin-viewport-switcher"
                  role="group"
                  aria-label="Edit layout breakpoint"
                >
                  {LAYOUT_BREAKPOINTS.map((bp) => {
                    const active = editBreakpoint === bp;
                    return (
                      <button
                        key={bp}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setEditBreakpoint(bp)}
                        className={`admin-viewport-switcher__btn${
                          active ? " is-active" : ""
                        }`}
                        title={
                          bp === "desktop"
                            ? "Edit desktop layout (4-col)"
                            : bp === "tablet"
                              ? "Edit tablet layout (~768px, 2-col) — does not change desktop"
                              : "Edit mobile layout (~390px, 1-col) — does not change desktop"
                        }
                      >
                        {BREAKPOINT_LABEL[bp]}
                      </button>
                    );
                  })}
                </div>
                <p className="font-mono text-[0.55rem] tracking-[0.12em] text-ink/45 uppercase">
                  Editing {BREAKPOINT_LABEL[editBreakpoint]}
                  {editBreakpoint === "desktop"
                    ? " · 4-col base"
                    : ` · ${editColumns}-col override`}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-3">
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
                    disabled={!canClearSelected}
                    onClick={clearSelectedToBlank}
                    title="Clear content — keep the cell as an unlabeled blank (section size stays)"
                    className="border border-ink/20 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Clear / Blank
                  </button>
                  <button
                    type="button"
                    disabled={!canRemoveSelected}
                    onClick={removeSelected}
                    title="Remove block and refill vacancy (section may shrink if not pinned)"
                    className="border border-rust/35 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-rust uppercase disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateItems((prev) => compactAllSections(prev))
                    }
                    disabled={editBreakpoint !== "desktop"}
                    title={
                      editBreakpoint === "desktop"
                        ? "Trim blank rows in every section — content defines height"
                        : "Switch to Desktop to compact section blanks"
                    }
                    className="border border-ink/20 px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-35"
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
                </div>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!isDirty || saveState === "saving"}
                  title="Publish draft to the public site"
                  className="min-w-[7.5rem] bg-rust px-5 py-2.5 font-mono text-[0.75rem] tracking-[0.16em] text-paper uppercase disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-paper/70"
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
            <div
              className="admin-preview min-h-0 flex-1 overflow-auto p-3 sm:p-4"
              data-breakpoint={editBreakpoint}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedId(null);
              }}
            >
              <div
                className="admin-preview__stage origin-top"
                data-breakpoint={editBreakpoint}
                style={
                  previewFrameWidth
                    ? {
                        width: "100%",
                        maxWidth: previewFrameWidth,
                        marginInline: "auto",
                      }
                    : undefined
                }
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setSelectedId(null);
                }}
              >
                <div className="admin-hero-preview mb-4 overflow-hidden border border-ink/15">
                  <div className="admin-preview-nav">
                    <HazyNav brand={siteTitle} items={siteNav} />
                  </div>
                  <IntroMask
                    key={`hero-${previewKey}-${enOf(hero.titleText)}-${hero.videoUrl}-${hero.imageUrl ?? ""}-${hero.watchUrl ?? ""}`}
                    maskText={hero.titleText}
                    support={hero.supportText}
                    videoSrc={hero.videoUrl}
                    posterSrc={hero.posterUrl}
                    imageSrc={hero.imageUrl}
                    watchUrl={hero.watchUrl}
                    enableHandCursor={false}
                  />
                </div>
                <SortableContext
                  items={gridSortableIds}
                  strategy={rectSortingStrategy}
                >
                  <AdminGridCanvas
                    key={`${previewKey}-${editBreakpoint}`}
                    items={viewItems}
                    selectedId={selectedId}
                    columns={editColumns}
                    layoutHint={
                      editBreakpoint === "desktop"
                        ? "Click to select · ⋮⋮ grip to reorder · edge handles to resize · Desktop layout"
                        : editBreakpoint === "tablet"
                          ? "Editing Tablet layout only · desktop placement unchanged · Save stores tablet overrides"
                          : "Editing Mobile layout only · desktop placement unchanged · Save stores mobile overrides"
                    }
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
              return next.map((row) => {
                if (row.id !== selected.id) return row;
                const merged = { ...row, ...patch } as GridItem;
                // Null sentinel clears optional fields (e.g. color-cell prose).
                const writable = merged as unknown as Record<string, unknown>;
                for (const [key, value] of Object.entries(patch)) {
                  if (value == null) delete writable[key];
                }
                return merged;
              });
            });
            setContentOpen(false);
          }}
          onClose={() => setContentOpen(false)}
        />
      ) : null}
    </div>
    </LocaleProvider>
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
      ? `${enOf(item.label)}${item.hidden ? " · Hidden" : ""}`
      : item.kind === "textCell"
        ? enOf(item.headline)
        : item.kind === "projectCell"
          ? enOf(item.title)
          : item.kind === "colorCell"
            ? enOf(item.label) || item.fill
            : item.kind === "blankCell"
              ? "Spacer"
              : enOf(item.caption) || "Media";

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
          {item.featured ? " · highlight" : ""} · c{item.colStart}/{item.colSpan} · r
          {item.rowSpan ?? 1}
        </p>
        <p className="truncate text-sm text-ink">{label}</p>
      </button>
    </li>
  );
}

function itemContentPreview(item: GridItem): string {
  if (item.kind === "titleRow") return enOf(item.label);
  if (item.kind === "colorCell") {
    const base =
      formatColorCellMeta(enOf(item.label) || item.fill, enOf(item.subcategory)) ||
      item.fill;
    return Object.keys(toLocaleMap(item.prose)).length
      ? `${base} · prose`
      : base;
  }
  if (item.kind === "textCell") return enOf(item.headline);
  if (item.kind === "projectCell") return enOf(item.title);
  if (item.kind === "blankCell") return "Spacer";
  return enOf(item.title) || enOf(item.caption) || "Media";
}

function HeroTab({
  hero,
  onChange,
}: {
  hero: HomepageHero;
  onChange: (patch: Partial<HomepageHero>) => void;
}) {
  const [locale, setLocale] = useState<LocaleCode>(DEFAULT_LOCALE);
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
          Cover / IntroMask
        </p>
        <p className="mt-1 text-xs text-ink/50">
          Edits stay local until Save publishes to Sanity{" "}
          <code className="font-mono">homepageHero</code>. Locale fields use the
          language switcher below (Studio also has a per-field language dropdown).
        </p>
      </div>

      <AdminLocaleSelect value={locale} onChange={setLocale} />

      <label className="block space-y-1">
        <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
          Hero title
        </span>
        <input
          type="text"
          value={readLocaleField(hero.titleText, locale)}
          onChange={(e) =>
            onChange({
              titleText: writeLocaleField(hero.titleText, locale, e.target.value),
            })
          }
          className="w-full border border-ink/20 bg-paper px-2 py-2 text-sm text-ink"
          placeholder="Amanda Smith"
        />
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
          Support line
        </span>
        <textarea
          value={readLocaleField(hero.supportText, locale)}
          onChange={(e) =>
            onChange({
              supportText: writeLocaleField(
                hero.supportText,
                locale,
                e.target.value,
              ),
            })
          }
          rows={3}
          className="w-full border border-ink/20 bg-paper px-2 py-2 text-sm text-ink"
          placeholder="Exhibitions, research, and writing…"
        />
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
          Stamp tip
        </span>
        <input
          type="text"
          value={readLocaleField(hero.stampHint, locale)}
          onChange={(e) =>
            onChange({
              stampHint: writeLocaleField(hero.stampHint, locale, e.target.value),
            })
          }
          className="w-full border border-ink/20 bg-paper px-2 py-2 text-sm text-ink"
          placeholder="click to leave your mark"
        />
        <span className="block text-xs text-ink/45">
          Public cover only — shown on first hover, hidden after the first
          stamp. Leave empty for the default copy.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
          Background video URL
        </span>
        <input
          type="text"
          value={hero.videoUrl}
          onChange={(e) => onChange({ videoUrl: e.target.value })}
          className="w-full border border-ink/20 bg-paper px-2 py-2 font-mono text-xs text-ink"
          placeholder="/media/intro.mp4 or https://youtube.com/watch?v=…"
        />
        <span className="block text-xs text-ink/45">
          Direct file path/URL, or a YouTube link (autoplay + loop). Leave empty
          for a still image only. Use the cover Sound control to unmute.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
          Watch full video URL
        </span>
        <input
          type="url"
          value={hero.watchUrl ?? ""}
          onChange={(e) => onChange({ watchUrl: e.target.value })}
          className="w-full border border-ink/20 bg-paper px-2 py-2 font-mono text-xs text-ink"
          placeholder="https://youtube.com/watch?v=… (optional)"
        />
        <span className="block text-xs text-ink/45">
          When set, shows a “Watch full video” link on the cover (opens in a new
          tab). Leave empty to hide it.
        </span>
      </label>

      <div className="space-y-1">
        <ImagePickerField
          label="Video poster"
          value={hero.posterUrl ?? ""}
          onChange={(posterUrl, posterAssetId) =>
            onChange({
              posterUrl: posterUrl || undefined,
              posterAssetId: posterAssetId || undefined,
            })
          }
        />
        <p className="text-xs text-ink/45">
          Still shown while the video loads / on failure. Uploads go to Sanity
          (cdn.sanity.io) so GitHub Pages can load them.
        </p>
      </div>

      <div className="space-y-1">
        <ImagePickerField
          label="Background image"
          value={hero.imageUrl ?? ""}
          onChange={(imageUrl, imageAssetId) =>
            onChange({
              imageUrl: imageUrl || undefined,
              imageAssetId: imageAssetId || undefined,
            })
          }
        />
        <p className="text-xs text-ink/45">
          Used when video is empty, or as an alternate poster. Prefer Sanity
          uploads for production.
        </p>
      </div>

      <div className="space-y-3 border-t border-ink/10 pt-4">
        <label className="block space-y-1">
          <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
            Subtext
          </span>
          <textarea
            value={readLocaleField(hero.subtext, locale)}
            onChange={(e) =>
              onChange({
                subtext: writeLocaleField(hero.subtext, locale, e.target.value),
              })
            }
            rows={4}
            className="w-full border border-ink/20 bg-paper px-2 py-2 text-sm text-ink"
            placeholder="An archival modernism practice…"
          />
          <span className="block text-xs text-ink/45">
            Tagline under the nav / above the grid. Matching English phrases
            keep definition underlines. Blank allowed. Spaces type normally.
          </span>
        </label>
        <TextStyleFields
          color={hero.subtextTextColor ?? ""}
          size={hero.subtextTextSize ?? "md"}
          onColorChange={(subtextTextColor) =>
            onChange({
              subtextTextColor: subtextTextColor || undefined,
            })
          }
          onSizeChange={(subtextTextSize) =>
            onChange({
              subtextTextSize:
                subtextTextSize === "md" ? undefined : subtextTextSize,
            })
          }
        />
        <p className="-mt-1 text-xs text-ink/45">
          Subtext only — size and color do not affect cover title or support
          line. Empty color = soft ink (current look).
        </p>
      </div>
    </div>
  );
}

function SectionTab({
  item,
  items,
  columns = GRID_COLUMNS,
  breakpoint = "desktop",
  onSectionLabelChange,
  onSectionRowsChange,
  onCompactSection,
  onSectionHiddenChange,
  onResize,
  onFeaturedChange,
  onDuplicate,
  onRemove,
}: {
  item: GridItem;
  items: GridItem[];
  columns?: number;
  breakpoint?: LayoutBreakpoint;
  onSectionLabelChange: (titleId: string, label: string) => void;
  onSectionRowsChange: (rows: number) => void;
  onCompactSection: () => void;
  onSectionHiddenChange: (hidden: boolean) => void;
  onResize: (
    patch: Partial<
      Pick<GridItem, "colStart" | "colSpan" | "rowSpan" | "rowStart">
    >,
  ) => void;
  onFeaturedChange: (featured: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const range = sectionIndexRange(items, item.id);
  const packed = packGridSectioned(items);
  const band = range ? measureSectionBand(items, range, packed) : null;
  const head = range ? items[range.start] : null;
  const sectionLabel =
    head?.kind === "titleRow" ? enOf(head.label) || "Section" : "Section";
  const isHidden =
    head?.kind === "titleRow" ? Boolean(head.hidden) : false;
  const canHide = head?.kind === "titleRow";
  const desktopOnlySection = breakpoint !== "desktop";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
          {sectionLabel}
          {isHidden ? " · Hidden" : ""}
          {` · ${BREAKPOINT_LABEL[breakpoint]}`}
        </p>
        {head?.kind === "titleRow" ? (
          <label className="block space-y-1">
            <span className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
              Section name
            </span>
            <input
              type="text"
              value={enOf(head.label)}
              onChange={(event) =>
                onSectionLabelChange(head.id, event.target.value)
              }
              className="w-full border border-ink/20 bg-paper px-2.5 py-2 font-display text-base tracking-tight text-ink"
              placeholder="Section title"
            />
          </label>
        ) : null}
        {desktopOnlySection ? (
          <p className="text-xs text-ink/50">
            Placement edits apply to {BREAKPOINT_LABEL[breakpoint]} only.
            Desktop layout is unchanged. Section size / compact stay desktop
            controls — switch to Desktop to edit them.
          </p>
        ) : null}
        {canHide ? (
          <label className="flex cursor-pointer items-start justify-between gap-3 border border-ink/12 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block font-mono text-[0.6rem] tracking-[0.14em] text-ink uppercase">
                Hide from public
              </span>
              <span className="mt-1 block text-xs text-ink/45">
                {isHidden
                  ? "Hidden on the public site · still visible here (dimmed)"
                  : "Section stays on the public homepage until you Save"}
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--color-rust)]"
              checked={isHidden}
              onChange={(event) => onSectionHiddenChange(event.target.checked)}
            />
          </label>
        ) : (
          <p className="text-xs text-ink/45">
            Add a title row to hide this band from the public site.
          </p>
        )}
        {desktopOnlySection ? null : band ? (
          <div className="space-y-2">
            <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
              Section size · {band.sectionRows} rows (content{" "}
              {band.contentHeight})
            </p>
            <NumberField
              label="Section rows"
              value={band.sectionRows}
              min={band.contentHeight}
              max={MAX_SECTION_ROWS}
              onChange={onSectionRowsChange}
            />
            <p className="text-xs text-ink/45">
              Grow adds empty target rows; shrink removes trailing blanks.
              Cannot go below content height.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink/50">
            No section metrics for this block.
          </p>
        )}
        {desktopOnlySection ? null : (
          <button
            type="button"
            onClick={onCompactSection}
            className="border border-ink/20 px-2 py-1.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase"
            title="Trim trailing blank rows in this section"
          >
            Compact section
          </button>
        )}
      </div>

      <div className="border-t border-ink/12 pt-4">
        <PlacementTab
          item={item}
          columns={columns}
          breakpoint={breakpoint}
          onResize={onResize}
          onFeaturedChange={onFeaturedChange}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

function PlacementTab({
  item,
  columns = GRID_COLUMNS,
  breakpoint = "desktop",
  onResize,
  onFeaturedChange,
  onDuplicate,
  onRemove,
}: {
  item: GridItem;
  columns?: number;
  breakpoint?: LayoutBreakpoint;
  onResize: (
    patch: Partial<
      Pick<GridItem, "colStart" | "colSpan" | "rowSpan" | "rowStart">
    >,
  ) => void;
  onFeaturedChange: (featured: boolean) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const maxSpan = columns - item.colStart + 1;

  return (
    <div className="space-y-3">
      <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/45 uppercase">
        Placement · {BREAKPOINT_LABEL[breakpoint]} · {item.kind}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="colStart"
          value={item.colStart}
          min={1}
          max={columns}
          onChange={(colStart) => {
            const colSpan = Math.min(item.colSpan, columns - colStart + 1);
            onResize({ colStart, colSpan });
          }}
          disabled={item.kind === "titleRow" || columns <= 1}
        />
        <NumberField
          label="colSpan"
          value={item.colSpan}
          min={1}
          max={maxSpan}
          onChange={(colSpan) => onResize({ colSpan })}
          disabled={item.kind === "titleRow" || columns <= 1}
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
          Featured highlight · span 2
        </label>
      ) : null}

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
  const [locale, setLocale] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [proseEnabled, setProseEnabled] = useState(
    () => item.kind === "colorCell" && Boolean(enOf(item.prose)),
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(structuredClone(item));
    setSectionChoice(currentSectionId ?? NEW_SECTION_VALUE);
    setNewSectionLabel("New section");
    setProseEnabled(item.kind === "colorCell" && Boolean(enOf(item.prose)));
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

  function setLoc(
    key: string,
    current: LocaleString | undefined,
    next: string,
  ) {
    patchDraft({ [key]: writeLocaleField(current, locale, next) } as Partial<GridItem>);
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
    const textStylePatch = {
      textColor: draft.textColor?.trim() || null,
      textSize:
        draft.textSize && draft.textSize !== "md" ? draft.textSize : null,
    };

    if (draft.kind === "colorCell") {
      const hasProse =
        proseEnabled && Object.keys(toLocaleMap(draft.prose)).length > 0;
      const hasSub =
        Object.keys(toLocaleMap(draft.subcategory)).length > 0;
      onApply(
        {
          fill: draft.fill,
          label: draft.label,
          href: draft.href?.trim() || undefined,
          subcategory: hasSub ? draft.subcategory : null,
          prose: hasProse ? draft.prose : null,
          ...textStylePatch,
        } as Partial<GridItem>,
        sectionTarget,
      );
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
          ...textStylePatch,
        } as Partial<GridItem>,
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
          ...textStylePatch,
        } as Partial<GridItem>,
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
        ...textStylePatch,
      } as Partial<GridItem>,
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
          {draft.kind !== "blankCell" ? (
            <AdminLocaleSelect value={locale} onChange={setLocale} />
          ) : null}
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
              value={readLocaleField(draft.label, locale)}
              onChange={(label) => setLoc("label", draft.label, label)}
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
                value={readLocaleField(draft.label, locale)}
                onChange={(label) => setLoc("label", draft.label, label)}
              />
              <TextField
                label="Subcategory"
                value={readLocaleField(draft.subcategory, locale)}
                onChange={(subcategory) =>
                  setLoc("subcategory", draft.subcategory, subcategory)
                }
              />
              <p className="-mt-1 text-xs text-ink/45">
                Optional. Separate each value with a comma — commas become
                middle-dots (·) on the live site (e.g. Channel, Happenings →
                Channel · Happenings).
              </p>
              <TextField
                label="Link URL"
                value={draft.href ?? ""}
                onChange={(href) => patchDraft({ href } as Partial<GridItem>)}
              />
              {proseEnabled ? (
                <div className="space-y-2">
                  <TextAreaField
                    label="Long text / prose"
                    value={readLocaleField(draft.prose, locale)}
                    onChange={(prose) => setLoc("prose", draft.prose, prose)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProseEnabled(false);
                      setDraft((prev) => {
                        if (prev.kind !== "colorCell") return prev;
                        const { prose: _removed, ...rest } = prev;
                        return rest as typeof prev;
                      });
                    }}
                    className="border border-ink/20 px-3 py-1.5 font-mono text-[0.6rem] tracking-[0.12em] uppercase"
                  >
                    Remove long text
                  </button>
                  <p className="text-xs text-ink/45">
                    Optional poetry or prose inside this color cell. Switch
                    Editing language above for other locales.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setProseEnabled(true)}
                  className="border border-ink/25 bg-paper px-3 py-2 font-mono text-[0.65rem] tracking-[0.14em] text-ink uppercase"
                >
                  Add long text
                </button>
              )}
            </>
          ) : null}

          {draft.kind === "mediaCell" ? (
            <>
              <TextField
                label="Meta"
                value={readLocaleField(draft.meta, locale)}
                onChange={(meta) => setLoc("meta", draft.meta, meta)}
              />
              <TextField
                label="Title"
                value={readLocaleField(draft.title, locale)}
                onChange={(title) => setLoc("title", draft.title, title)}
              />
              <TextField
                label="Caption"
                value={readLocaleField(draft.caption, locale)}
                onChange={(caption) => setLoc("caption", draft.caption, caption)}
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
                value={readLocaleField(draft.description, locale)}
                onChange={(description) =>
                  setLoc("description", draft.description, description)
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
                value={readLocaleField(draft.meta, locale)}
                onChange={(meta) => setLoc("meta", draft.meta, meta)}
              />
              <TextField
                label="Title"
                value={readLocaleField(draft.headline, locale)}
                onChange={(headline) => setLoc("headline", draft.headline, headline)}
              />
              <TextField
                label="Subtitle"
                value={readLocaleField(draft.subtitle, locale)}
                onChange={(subtitle) => setLoc("subtitle", draft.subtitle, subtitle)}
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
                value={readLocaleField(draft.excerpt, locale)}
                onChange={(excerpt) => setLoc("excerpt", draft.excerpt, excerpt)}
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
                value={readLocaleField(draft.meta, locale)}
                onChange={(meta) => setLoc("meta", draft.meta, meta)}
              />
              <TextField
                label="Title"
                value={readLocaleField(draft.title, locale)}
                onChange={(title) => setLoc("title", draft.title, title)}
              />
              <TextField
                label="Subtitle"
                value={readLocaleField(draft.subtitle, locale)}
                onChange={(subtitle) => setLoc("subtitle", draft.subtitle, subtitle)}
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
                value={readLocaleField(draft.summary, locale)}
                onChange={(summary) => setLoc("summary", draft.summary, summary)}
              />
              <TextField
                label="Link URL"
                value={draft.href ?? ""}
                onChange={(href) => patchDraft({ href } as Partial<GridItem>)}
              />
            </>
          ) : null}

          {draft.kind === "colorCell" ||
          draft.kind === "mediaCell" ||
          draft.kind === "textCell" ||
          draft.kind === "projectCell" ? (
            <TextStyleFields
              color={draft.textColor ?? ""}
              size={draft.textSize ?? "md"}
              onColorChange={(textColor) =>
                patchDraft({ textColor: textColor || undefined } as Partial<GridItem>)
              }
              onSizeChange={(textSize) =>
                patchDraft({
                  textSize: textSize === "md" ? undefined : textSize,
                } as Partial<GridItem>)
              }
            />
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

function TextStyleFields({
  color,
  size,
  onColorChange,
  onSizeChange,
}: {
  color: string;
  size: CellTextSize;
  onColorChange: (color: string) => void;
  onSizeChange: (size: CellTextSize) => void;
}) {
  const pickerValue = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
    ? color
    : "#1a1a1a";
  return (
    <div className="space-y-3 border-t border-ink/10 pt-3">
      <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink/50 uppercase">
        Text style
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
            Text color
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={pickerValue}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-9 w-12 cursor-pointer border border-ink/20 bg-paper p-0.5"
              title="Pick text color"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              placeholder="#1a1a1a (default)"
              className="w-36 border border-ink/20 bg-paper px-2 py-1.5 font-mono text-xs text-ink"
            />
            {color ? (
              <button
                type="button"
                onClick={() => onColorChange("")}
                className="border border-ink/20 px-2 py-1.5 font-mono text-[0.55rem] tracking-[0.1em] uppercase"
              >
                Reset
              </button>
            ) : null}
          </div>
        </label>
        <SelectField
          label="Text size"
          value={size}
          options={CELL_TEXT_SIZES.map((value) => ({
            value,
            label:
              value === "sm"
                ? "Small"
                : value === "md"
                  ? "Medium (default)"
                  : value === "lg"
                    ? "Large"
                    : "Extra large",
          }))}
          onChange={(next) => onSizeChange(next as CellTextSize)}
        />
      </div>
      <p className="text-xs text-ink/45">
        Applies to meta, titles, subtitles, prose, and body text on this block.
        Empty color = black.
      </p>
    </div>
  );
}

function ImagePickerField({
  label = "Image",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string, assetId?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(false);
  const [storageNote, setStorageNote] = useState<string | null>(null);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    setStorageNote(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        src?: string;
        assetId?: string;
        storage?: string;
        warning?: string;
        error?: string;
      };
      if (!res.ok || !data.src) {
        throw new Error(data.error || "Upload failed");
      }
      onChange(data.src, data.assetId);
      if (data.storage === "sanity") {
        setStorageNote("Stored on Sanity CDN");
      } else if (data.warning) {
        setStorageNote(data.warning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] tracking-[0.08em] text-ink/55 uppercase">
        {label}
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
              onClick={() => onChange("", undefined)}
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
              onChange={(e) => onChange(e.target.value, undefined)}
              placeholder="https://cdn.sanity.io/… or /media/…"
              className="w-full border border-ink/15 bg-paper px-2 py-1.5 font-mono text-[0.7rem] text-ink/70"
            />
          ) : value ? (
            <p className="truncate font-mono text-[0.6rem] text-ink/40">
              {value}
            </p>
          ) : null}
          {storageNote ? (
            <p className="text-xs text-ink/50">{storageNote}</p>
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
