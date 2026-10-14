/** Next.js cache options for live Node deploys; omitted for static Pages export. */
export const sanityFetchOptions =
  process.env.GITHUB_PAGES === "1"
    ? {}
    : { next: { tags: ["homepage"] as string[], revalidate: 0 as const } };
