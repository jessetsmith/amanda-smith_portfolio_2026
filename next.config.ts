import type { NextConfig } from "next";

/** GitHub Pages static export (see `.github/workflows/deploy-pages.yml`). */
const isPages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  ...(isPages
    ? {
        // Static hosting — no PPR / Cache Components (incompatible with `output: 'export'`).
        output: "export" as const,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        cacheComponents: true,
        partialPrefetching: true,
        // Only validate routes that opt in with `export const instant`.
        // Avoids blocking-prerender failures on public pages that use connection().
        experimental: {
          instantInsights: {
            validationLevel: "manual-warning",
          },
        },
      }),
  transpilePackages: ["next-sanity", "sanity"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
