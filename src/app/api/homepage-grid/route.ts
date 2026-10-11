import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  loadGridItems,
  resetGridToSeed,
  saveGridItems,
} from "@/lib/grid-sync";
import type { GridItem } from "@/types/grid";

function revalidatePublicViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/cv");
}

export async function GET() {
  const result = await loadGridItems();
  return NextResponse.json(result);
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
    return NextResponse.json(
      { error: "Expected { items: GridItem[] }" },
      { status: 400 },
    );
  }

  const result = await saveGridItems(items);
  revalidatePublicViews();
  return NextResponse.json(result);
}

export async function DELETE() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await resetGridToSeed();
  revalidatePublicViews();
  return NextResponse.json(result);
}
