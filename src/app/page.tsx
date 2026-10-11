import { connection } from "next/server";
import { HomepageGrid } from "@/components/grid/HomepageGrid";
import { HazyNav } from "@/components/HazyNav";
import { IntroMask } from "@/components/IntroMask";
import { DefinitionText } from "@/components/DefinitionText";
import { getHomepageContent, getSiteSettings } from "@/lib/content";

export default async function Home() {
  await connection();
  const [home, site] = await Promise.all([
    getHomepageContent(),
    getSiteSettings(),
  ]);

  return (
    <>
      <HazyNav brand={site.siteTitle} items={site.nav} />
      <main className="flex flex-1 flex-col">
        <IntroMask
          brand={site.siteTitle}
          maskText={home.maskText}
          support={home.support}
          videoSrc={home.videoSrc}
          posterSrc={home.posterSrc}
        />
        <div id="grid" className="relative z-10 bg-paper">
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
