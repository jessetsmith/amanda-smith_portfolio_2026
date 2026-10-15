import { connection } from "next/server";
import { HomepageGrid } from "@/components/grid/HomepageGrid";
import { HazyNav } from "@/components/HazyNav";
import { IntroMask } from "@/components/IntroMask";
import { DefinitionText } from "@/components/DefinitionText";
import { getHomepageContent, getSiteSettings } from "@/lib/content";

/** Allow request-time Sanity/fixture fetch under Cache Components (Vercel). */
export const instant = false;

export default async function Home() {
  // Static export (optional Pages build) cannot use connection().
  if (process.env.GITHUB_PAGES !== "1") {
    await connection();
  }
  const [home, site] = await Promise.all([
    getHomepageContent(),
    getSiteSettings(),
  ]);

  return (
    <>
      <HazyNav brand={site.siteTitle} items={site.nav} />
      <main className="flex flex-1 flex-col">
        <IntroMask
          maskText={home.maskText}
          support={home.support}
          videoSrc={home.videoSrc}
          posterSrc={home.posterSrc}
          imageSrc={home.imageSrc}
          watchUrl={home.watchUrl}
        />
        <div id="grid" className="relative z-10 overflow-x-clip bg-paper">
          <div className="mx-auto max-w-[90rem] px-4 pt-10 pb-2 sm:px-6 md:px-8">
            <DefinitionText
              className="max-w-2xl text-base leading-relaxed text-ink/70 sm:text-lg"
              text="An archival modernism practice shaped by relational space and trauma-informed research across exhibitions and writing."
            />
          </div>
          <HomepageGrid items={home.gridItems} />
        </div>
      </main>
    </>
  );
}
