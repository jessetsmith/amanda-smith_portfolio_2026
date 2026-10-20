import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { normalizeSiteSettings } from "@/lib/site";
import { loadSiteSettings, saveSiteSettings } from "@/lib/site-sync";
import type { SiteSettings } from "@/types/content";

function revalidatePublicViews() {
  revalidateTag("homepage", "max");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/cv");
}

export async function GET() {
  const site = await loadSiteSettings();
  return NextResponse.json({ site, source: site.source });
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

  const siteRaw = (body as { site?: Partial<SiteSettings> })?.site;
  if (!siteRaw || typeof siteRaw !== "object") {
    return NextResponse.json(
      { error: "Expected { site: SiteSettings }" },
      { status: 400 },
    );
  }

  const site = await saveSiteSettings(normalizeSiteSettings(siteRaw));
  revalidatePublicViews();
  return NextResponse.json({ site, source: site.source });
}
