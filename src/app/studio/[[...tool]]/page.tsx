import { isSanityConfigured } from "@/sanity/env";
import { Studio } from "./Studio";

export default function StudioPage() {
  if (!isSanityConfigured()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16 text-[#1a1a1a]">
        <p className="font-mono text-xs tracking-[0.2em] uppercase opacity-60">
          Sanity Studio
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Project ID not configured
        </h1>
        <p className="mt-4 text-base leading-relaxed opacity-80">
          Schemas for <code>project</code>, <code>publication</code>,{" "}
          <code>researchItem</code>, <code>cv</code>, <code>homepage</code>,{" "}
          <code>homepageHero</code>, and <code>siteSettings</code> are
          scaffolded in <code>src/sanity/schemaTypes</code>.
        </p>
        <p className="mt-3 text-base leading-relaxed opacity-80">
          Create a Sanity project, then set{" "}
          <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code>,{" "}
          <code>NEXT_PUBLIC_SANITY_DATASET</code>, and optionally{" "}
          <code>SANITY_API_READ_TOKEN</code> in <code>.env.local</code>. Until
          then, the public site and <code>/admin</code> keep using local
          fixtures.
        </p>
        <p className="mt-6 text-sm opacity-60">
          Path: <code>/studio</code> · config: <code>sanity.config.ts</code>
        </p>
      </main>
    );
  }

  return <Studio />;
}
