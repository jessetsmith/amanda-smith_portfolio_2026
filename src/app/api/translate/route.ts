import { NextResponse } from "next/server";

/**
 * Legacy stub — public copy is now self-hosted via Sanity localeString /
 * localeText + the navbar language dropdown (no paid translate API).
 */
export async function POST() {
  return NextResponse.json(
    {
      stub: true,
      message:
        "Translate API retired — use the language dropdown and Sanity locale fields.",
    },
    { status: 410 },
  );
}
