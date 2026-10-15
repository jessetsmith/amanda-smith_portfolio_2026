import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Serve Sanity Create/Manage manifest files at `/studio/static/*`.
 * The Studio catch-all (`[[...tool]]`) would otherwise return HTML for these
 * paths on Vercel, so Manage cannot detect Schema for self-hosted studios.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length || segments.some((part) => part === ".." || part.includes("\0"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fileName = segments.join("/");
  if (!/^[\w.-]+\.json$/.test(fileName)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const root = path.resolve(process.cwd(), "public", "studio", "static");
  const resolved = path.resolve(root, fileName);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const body = await readFile(resolved);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
