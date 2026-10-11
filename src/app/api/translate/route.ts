import { NextResponse } from "next/server";

/**
 * Phase 6 light stub — returns a stub payload unless GOOGLE_TRANSLATE_API_KEY
 * is configured. Does not invent credentials or call Google without a key.
 */
export async function POST(request: Request) {
  let body: { text?: string; target?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  const target = body.target?.trim() || "es";
  const source = body.source?.trim() || "en";

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      stub: true,
      source,
      target,
      originalText: text,
      translatedText: text,
      message:
        "Translate API stub — set GOOGLE_TRANSLATE_API_KEY to enable holistic page translate.",
    });
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: "text",
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Translate provider error", stub: false },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      data?: { translations?: { translatedText?: string }[] };
    };
    const translatedText =
      data.data?.translations?.[0]?.translatedText ?? text;
    return NextResponse.json({
      stub: false,
      source,
      target,
      originalText: text,
      translatedText,
    });
  } catch {
    return NextResponse.json(
      { error: "Translate request failed" },
      { status: 502 },
    );
  }
}
