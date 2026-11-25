import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCvPageContent } from "@/lib/content";
import { FALLBACK_CV_PDF, FALLBACK_CV_PDF_FILENAME } from "@/lib/cv";
import { SanityPersistenceError } from "@/lib/sanity-errors";
import { isSanityConfigured } from "@/sanity/env";
import { getWriteClient } from "@/sanity/lib/write-client";
import type { CvPageContent } from "@/types/content";

export async function loadCvPage(): Promise<CvPageContent> {
  return getCvPageContent();
}

/**
 * Upload a PDF buffer to Sanity (preferred) or local public/media/cv,
 * attach to the `cv` singleton, and return the public page payload.
 */
export async function saveCvPdf(file: {
  buffer: Buffer;
  filename: string;
  contentType?: string;
}): Promise<CvPageContent> {
  const safeName =
    file.filename
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || FALLBACK_CV_PDF_FILENAME;
  const contentType = file.contentType || "application/pdf";

  const writeClient = getWriteClient();
  if (isSanityConfigured()) {
    if (!writeClient) {
      throw new SanityPersistenceError(
        "Sanity write token is not configured on the server (SANITY_API_WRITE_TOKEN).",
        503,
      );
    }
    try {
      const asset = await writeClient.assets.upload("file", file.buffer, {
        filename: safeName,
        contentType,
      });
      if (!asset.url) {
        throw new Error("Sanity file asset missing url");
      }
      await writeClient
        .transaction()
        .createIfNotExists({
          _id: "cv",
          _type: "cv",
          name: "Amanda Smith",
        })
        .patch("cv", {
          set: {
            cvPdf: {
              _type: "file",
              asset: {
                _type: "reference",
                _ref: asset._id,
              },
            },
          },
        })
        .commit();

      return {
        ...(await getCvPageContent()),
        source: "sanity",
        pdfUrl: asset.url,
        pdfFilename: asset.originalFilename || safeName,
      };
    } catch (err) {
      console.error("[cv-sync] Sanity CV PDF upload failed", err);
      throw new SanityPersistenceError(
        "Failed to upload CV PDF to Sanity.",
        502,
        { cause: err },
      );
    }
  }

  const uploadsDir = path.join(process.cwd(), "public", "media", "cv");
  await mkdir(uploadsDir, { recursive: true });
  const destName = safeName.toLowerCase().endsWith(".pdf")
    ? safeName
    : `${safeName}.pdf`;
  await writeFile(path.join(uploadsDir, destName), file.buffer);
  const base = await getCvPageContent();

  return {
    ...base,
    source: "fixture",
    pdfUrl: `/media/cv/${destName}` || FALLBACK_CV_PDF,
    pdfFilename: destName,
  };
}
