import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  readGridItems,
  resetGridItems,
  writeGridItems,
} from "@/lib/grid-store";
import type { GridItem } from "@/types/grid";

export async function GET() {
  const items = await readGridItems();
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body as { items?: GridItem[] })?.items;
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Expected { items: GridItem[] }" }, { status: 400 });
  }

  const saved = await writeGridItems(items);
  return NextResponse.json({ items: saved });
}

export async function DELETE() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await resetGridItems();
  return NextResponse.json({ items });
}
