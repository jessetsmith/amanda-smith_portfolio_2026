import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdminWrite } from "@/lib/auth";
import { sniffImage } from "@/lib/image-sniff";
import { getWriteClient } from "@/sanity/lib/write-client";

const MAX_BYTES = 8 * 1024 * 1024;

function slugBase(name: string): string {
  const base = path.basename(name, path.extname(name));
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "image";
}

export async function POST(request: Request) {
  const denied = await requireAdminWrite(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Expected image file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 8MB or smaller" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // The stored type comes only from the file's bytes, so a renamed SVG/HTML file is rejected.
  const image = sniffImage(buffer);
  if (!image) {
    return NextResponse.json(
      { error: "Unsupported image. Use JPEG, PNG, WebP, GIF, or AVIF (SVG is not allowed)." },
      { status: 400 },
    );
  }

  const filename = `${slugBase(file.name)}-${randomBytes(4).toString("hex")}${image.ext}`;

  // Prefer Sanity assets so GitHub Pages / production can load cdn.sanity.io URLs.
  const writeClient = getWriteClient();
  if (writeClient) {
    try {
      const asset = await writeClient.assets.upload("image", buffer, {
        filename,
        contentType: image.mime,
      });
      const src = asset.url;
      if (!src) {
        throw new Error("Sanity asset missing url");
      }
      return NextResponse.json({
        src,
        assetId: asset._id,
        filename,
        storage: "sanity",
      });
    } catch (err) {
      console.error("Sanity asset upload failed, falling back to local", err);
    }
  }

  const uploadsDir = path.join(process.cwd(), "public", "media", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const src = `/media/uploads/${filename}`;
  return NextResponse.json({
    src,
    filename,
    storage: "local",
    warning:
      "Saved locally only — not available on GitHub Pages. Configure Sanity write token to upload to CDN.",
  });
}
