import { createClient } from "next-sanity";
import { apiVersion, dataset, isSanityConfigured, projectId } from "../env";

const token = process.env.SANITY_API_READ_TOKEN || undefined;

export const client = isSanityConfigured()
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      // Prefer fresh reads when authenticated; CDN ok for public anon later
      useCdn: !token,
      token,
    })
  : null;
