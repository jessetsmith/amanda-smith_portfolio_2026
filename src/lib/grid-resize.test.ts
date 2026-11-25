import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GridItem } from "@/types/grid";
import { normalizeGridItems } from "@/lib/grid-normalize";
import { packGridSectioned, stripBlankCells } from "@/lib/grid-layout";
import { applyGridResize } from "@/lib/grid-resize";

type Spec = [id: string, col: number, w: number, h?: number];

function layout(...sections: Spec[][]): GridItem[] {
  const items: GridItem[] = [];
  sections.forEach((specs, s) => {
    items.push({
      id: `title-${s}`,
      order: 0,
      kind: "titleRow",
      colStart: 1,
      colSpan: 4,
      rowSpan: 1,
      label: { en: `Section ${s}` },
    } as GridItem);
    for (const [id, col, w, h = 1] of specs) {
      items.push({
        id,
        order: 0,
        kind: "textCell",
        colStart: col,
        colSpan: w,
        rowSpan: h,
        headline: { en: id },
      } as GridItem);
    }
  });
  return normalizeGridItems(items);
}

/** id -> "col,row,w,h" for every content block after packing. */
function geometry(items: GridItem[]): Record<string, string> {
  const content = stripBlankCells(items).filter((i) => i.kind !== "titleRow");
  const packed = packGridSectioned(stripBlankCells(items));
  return Object.fromEntries(
    content.map((i) => {
      const g = packed.get(i.id)!;
      return [i.id, `${g.col},${g.row},${g.w},${g.h}`];
    }),
  );
}

describe("applyGridResize: directional reflow", () => {
  it("grows right into a blank without moving the neighbour", () => {
    const items = layout([
      ["a", 1, 1, 2],
      ["b", 3, 1, 2],
    ]);
    const next = applyGridResize(items, "a", { colStart: 1, colSpan: 2 });
    assert.deepEqual(geometry(next), { a: "1,2,2,2", b: "3,2,1,2" });
  });

  it("grows right and shifts the neighbour one column right (Jesse's case)", () => {
    const items = layout([
      ["a", 1, 1, 2],
      ["b", 2, 1, 2],
    ]);
    const next = applyGridResize(items, "a", { colStart: 1, colSpan: 2 });
    assert.deepEqual(geometry(next), { a: "1,2,2,2", b: "3,2,1,2" });
    assert.equal(next.find((i) => i.id === "b")!.colSpan, 1);
  });

  it("cascades a shift across neighbours and keeps sizes", () => {
    const items = layout([
      ["a", 1, 1],
      ["b", 2, 1],
      ["c", 3, 1],
    ]);
    const next = applyGridResize(items, "a", { colStart: 1, colSpan: 2 });
    assert.deepEqual(geometry(next), {
      a: "1,2,2,1",
      b: "3,2,1,1",
      c: "4,2,1,1",
    });
  });

  it("wraps the last block to the next row when the row is full", () => {
    const items = layout([
      ["a", 1, 1],
      ["b", 2, 1],
      ["c", 3, 1],
      ["d", 4, 1],
    ]);
    const next = applyGridResize(items, "a", { colStart: 1, colSpan: 2 });
    const g = geometry(next);
    assert.equal(g.a, "1,2,2,1");
    assert.equal(g.b, "3,2,1,1");
    assert.equal(g.c, "4,2,1,1");
    const d = g.d.split(",").map(Number);
    assert.ok(d[1] > 2, "d wraps below the first row");
    assert.equal(d[2], 1);
    assert.equal(d[3], 1);
  });

  it("full width pushes the row's other blocks down", () => {
    const items = layout([
      ["a", 1, 1],
      ["b", 2, 1],
      ["c", 3, 1],
    ]);
    const next = applyGridResize(items, "a", { colStart: 1, colSpan: 4 });
    const g = geometry(next);
    assert.equal(g.a, "1,2,4,1");
    for (const id of ["b", "c"]) {
      const [col, row, w, h] = g[id].split(",").map(Number);
      assert.ok(row > 2, `${id} moved below the full-width block`);
      assert.equal(w, 1);
      assert.equal(h, 1);
      assert.ok(col >= 1);
    }
  });

  it("grows left, moving the left neighbour further left", () => {
    const items = layout([
      ["a", 2, 1],
      ["b", 3, 1],
    ]);
    const next = applyGridResize(items, "b", { colStart: 2, colSpan: 2 });
    assert.deepEqual(geometry(next), { a: "1,2,1,1", b: "2,2,2,1" });
  });

  it("grows left into a blank without moving anything", () => {
    const items = layout([
      ["a", 1, 1],
      ["b", 4, 1],
    ]);
    const next = applyGridResize(items, "b", { colStart: 3, colSpan: 2 });
    assert.deepEqual(geometry(next), { a: "1,2,1,1", b: "3,2,2,1" });
  });

  it("growing down only pushes blocks in the affected columns", () => {
    const items = layout([
      ["a", 1, 1, 1],
      ["b", 2, 1, 1],
      ["c", 1, 1, 1],
      ["d", 2, 1, 1],
    ]);
    const next = applyGridResize(items, "a", { rowSpan: 2 });
    assert.deepEqual(geometry(next), {
      a: "1,2,1,2",
      b: "2,2,1,1",
      c: "1,4,1,1",
      d: "2,3,1,1",
    });
  });

  it("shrinking leaves the neighbour in place (blank is left behind)", () => {
    const items = layout([
      ["a", 1, 2, 1],
      ["b", 3, 1, 1],
    ]);
    const next = applyGridResize(items, "a", { colStart: 1, colSpan: 1 });
    assert.deepEqual(geometry(next), { a: "1,2,1,1", b: "3,2,1,1" });
    assert.ok(next.some((i) => i.kind === "blankCell"));
  });

  it("never moves blocks in another section", () => {
    const items = layout(
      [
        ["a", 1, 1],
        ["b", 2, 1],
      ],
      [["x", 2, 1]],
    );
    const before = geometry(items);
    const next = applyGridResize(items, "a", { colStart: 1, colSpan: 2 });
    const after = geometry(next);
    assert.equal(after.x.split(",")[0], before.x.split(",")[0]);
    assert.equal(next.find((i) => i.id === "x")!.colSpan, 1);
    const sectionOfX = next.findIndex((i) => i.id === "x");
    const titleOfX = next.findIndex((i) => i.id === "title-1");
    assert.ok(titleOfX < sectionOfX);
    assert.ok(next.findIndex((i) => i.id === "b") < titleOfX);
  });

  it("is deterministic (same input, same output including blank ids)", () => {
    const items = layout([
      ["a", 1, 1, 2],
      ["b", 2, 1, 2],
    ]);
    const one = applyGridResize(items, "a", { colStart: 1, colSpan: 2 });
    const two = applyGridResize(items, "a", { colStart: 1, colSpan: 2 });
    assert.deepEqual(one, two);
  });
});
