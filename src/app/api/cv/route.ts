import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { loadCvPage, saveCvPdf } from "@/lib/cv-sync";

const MAX_BYTES = 20 * 1024 * 1024;

function revalidatePublicViews() {
  revalidateTag("homepage", "max");
  revalidatePath("/cv");
  revalidatePath("/admin");
}

export async function GET() {
  const page = await loadCvPage();
  return NextResponse.json({
    source: page.source,
    pdfUrl: page.pdfUrl,
    pdfFilename: page.pdfFilename,
    videoSrc: page.videoSrc,
  });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Expected PDF file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "PDF must be 20MB or smaller" },
      { status: 400 },
    );
  }

  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (type && type !== "application/pdf" && !name.endsWith(".pdf")) {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }
  if (!name.endsWith(".pdf") && type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const page = await saveCvPdf({
      buffer,
      filename: file.name || "cv.pdf",
      contentType: type || "application/pdf",
    });
    revalidatePublicViews();
    return NextResponse.json({
      source: page.source,
      pdfUrl: page.pdfUrl,
      pdfFilename: page.pdfFilename,
      videoSrc: page.videoSrc,
    });
  } catch (err) {
    console.error("CV PDF upload failed", err);
    return NextResponse.json(
      { error: "Failed to upload CV PDF" },
      { status: 500 },
    );
  }
}
