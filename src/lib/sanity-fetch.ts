/** Next.js cache options for live Node deploys; omitted for static Pages export. */
export const sanityFetchOptions =
  process.env.GITHUB_PAGES === "1"
    ? {}
    : {
        // Avoid stale admin/public reads after Save (textSize etc. were wiped by
        // a cached GROQ payload that predated the field).
        cache: "no-store" as const,
        next: { tags: ["homepage"] as string[], revalidate: 0 as const },
      };
