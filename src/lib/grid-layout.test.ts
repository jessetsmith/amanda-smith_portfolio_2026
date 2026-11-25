import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GridItem } from "@/types/grid";
import {
  clearItemToBlank,
  packGridSectioned,
  setSectionRowCount,
} from "@/lib/grid-layout";
import { normalizeGridItems } from "@/lib/grid-normalize";
import { addContentSection } from "@/lib/grid-section";

function baseGrid(): GridItem[] {
  return normalizeGridItems([
    {
      id: "title-a",
      order: 1,
      kind: "titleRow",
      colStart: 1,
      colSpan: 4,
      rowSpan: 1,
      label: { en: "Section A" },
    },
    {
      id: "card-a1",
      order: 2,
      kind: "textCell",
      colStart: 1,
      colSpan: 2,
      rowSpan: 2,
      headline: { en: "Card A1" },
    },
    {
      id: "title-b",
      order: 3,
      kind: "titleRow",
      colStart: 1,
      colSpan: 4,
      rowSpan: 1,
      label: { en: "Section B" },
    },
    {
      id: "card-b1",
      order: 4,
      kind: "textCell",
      colStart: 1,
      colSpan: 1,
      rowSpan: 1,
      headline: { en: "Card B1" },
    },
  ] as GridItem[]);
}

describe("grid-layout blank ids and section spacing", () => {
  it("produces unique blank ids and non-overlapping rows when adding multiple sections", () => {
    const first = addContentSection(baseGrid(), {
      afterTitleId: "title-a",
      label: "New 1",
      sectionRows: 3,
    });
    const second = addContentSection(first.items, {
      afterTitleId: first.selectedId,
      label: "New 2",
      sectionRows: 3,
    });
    const normalized = normalizeGridItems(second.items);

    const ids = normalized.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, "every grid item id must be unique");

    const title1 = normalized.find((item) => item.id === first.selectedId)!;
    const title2 = normalized.find((item) => item.id === second.selectedId)!;
    const titleB = normalized.find((item) => item.id === "title-b")!;
    assert.ok(
      (title2.rowStart ?? 0) >= (title1.rowStart ?? 0) + 3,
      "second added section must start after first section's explicit sectionRows",
    );
    assert.ok(
      (titleB.rowStart ?? 0) >= (title2.rowStart ?? 0) + 3,
      "following section must start after second added section's explicit sectionRows",
    );
  });

  it("advances subsequent sections when explicit sectionRows exceeds content height", () => {
    const grown = normalizeGridItems(setSectionRowCount(baseGrid(), "title-a", 6));
    const packed = packGridSectioned(grown);
    const titleA = packed.get("title-a")!;
    const titleB = packed.get("title-b")!;
    assert.ok(
      titleB.row >= titleA.row + 6,
      `expected title-b (row ${titleB.row}) >= title-a (${titleA.row}) + 6`,
    );
    const ids = grown.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("keeps ids unique and deterministic after clearItemToBlank + addContentSection", () => {
    const cleared = clearItemToBlank(baseGrid(), "card-a1");
    const added = addContentSection(cleared, {
      afterTitleId: "title-a",
      label: "Inserted",
      sectionRows: 3,
    });
    const run1 = normalizeGridItems(added.items);
    const run2 = normalizeGridItems(added.items);
    assert.deepEqual(run1, run2);
    const ids = run1.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
