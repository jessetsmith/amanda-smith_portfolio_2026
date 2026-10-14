import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { normalizeHero } from "@/lib/hero";
import { loadHero, saveHero } from "@/lib/hero-sync";
import type { HomepageHero } from "@/types/hero";

function revalidatePublicViews() {
  revalidateTag("homepage", "max");
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function GET() {
  const result = await loadHero();
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

  const heroRaw = (body as { hero?: Partial<HomepageHero> })?.hero;
  if (!heroRaw || typeof heroRaw !== "object") {
    return NextResponse.json(
      { error: "Expected { hero: HomepageHero }" },
      { status: 400 },
    );
  }

  const result = await saveHero(normalizeHero(heroRaw));
  revalidatePublicViews();
  return NextResponse.json(result);
}
