import { defineCliConfig } from "sanity/cli";

/**
 * Embedded Studio is self-hosted on Vercel at /studio.
 * Register + refresh schema/manifest with:
 *   npm run sanity:studio-register
 * (CI: SANITY_AUTH_TOKEN + same command after production deploys.)
 */
export default defineCliConfig({
  api: {
    projectId:
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "00c2spwm",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  },
  studioHost: "https://portfolio.bittersweetwoman.com/studio",
  deployment: {
    // Registered via `sanity deploy --external` (primary production URL)
    appId: "cad63oqjgx1lk2ipa3ldonmv",
    // Embedded Next.js Studio cannot use Sanity-hosted auto-updates
    autoUpdates: false,
  },
});
