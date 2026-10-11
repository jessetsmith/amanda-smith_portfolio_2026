export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";

/** True only when a real project ID is configured (not empty / placeholder). */
export function isSanityConfigured(): boolean {
  const id = projectId.trim();
  return Boolean(id) && id !== "placeholder-project";
}
