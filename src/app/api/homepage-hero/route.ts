import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminWrite } from "@/lib/auth";
import { normalizeHero } from "@/lib/hero";
import { loadHero, saveHero } from "@/lib/hero-sync";
import { errorStatus, extractErrorMessage } from "@/lib/sanity-errors";
import type { HomepageHero } from "@/types/hero";

function revalidatePublicViews() {
  revalidateTag("homepage", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function GET() {
  const result = await loadHero();
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const denied = await requireAdminWrite(request);
  if (denied) return denied;

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

  try {
    const result = await saveHero(normalizeHero(heroRaw));
    revalidatePublicViews();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/homepage-hero] PUT failed", err);
    return NextResponse.json(
      { error: extractErrorMessage(err, "Failed to save homepage hero") },
      { status: errorStatus(err, 500) },
    );
  }
}
