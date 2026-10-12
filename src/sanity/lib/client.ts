import { createClient } from "next-sanity";
import { apiVersion, dataset, isSanityConfigured, projectId } from "../env";

const token = process.env.SANITY_API_READ_TOKEN || undefined;

export const client = isSanityConfigured()
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      // Always hit the API after Save/Publish — CDN lags behind mutations
      // and was a root cause of public `/` missing admin grid updates.
      useCdn: false,
      token,
    })
  : null;

/** Next.js cache tag for homepage grid + intro fields. */
export const HOMEPAGE_CACHE_TAG = "homepage";
