import { connection } from "next/server";
import { HomepageGrid } from "@/components/grid/HomepageGrid";
import { HazyNav } from "@/components/HazyNav";
import { IntroMask } from "@/components/IntroMask";
import { GridIntroBlurb } from "@/components/GridIntroBlurb";
import { SiteShell } from "@/components/SiteShell";
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
    <SiteShell uiCopy={home.uiCopy}>
      <HazyNav
        brand={site.siteTitle}
        items={site.nav}
        textColor={site.navTextColor}
        textSize={site.navTextSize}
      />
      <main className="flex flex-1 flex-col">
        <IntroMask
          maskText={home.maskText}
          support={home.support}
          videoSrc={home.videoSrc}
          posterSrc={home.posterSrc}
          imageSrc={home.imageSrc}
          watchUrl={home.watchUrl}
          stampHint={home.stampHint}
          titleTextColor={home.titleTextColor}
          titleTextSize={home.titleTextSize}
          supportTextColor={home.supportTextColor}
          supportTextSize={home.supportTextSize}
        />
        <div id="grid" className="relative z-10 overflow-x-clip bg-paper">
          <div className="grid-intro-wrap mx-auto max-w-[90rem] px-4 sm:px-6 md:px-8">
            <GridIntroBlurb
              className="max-w-2xl"
              text={home.subtext}
              textColor={home.subtextTextColor}
              textSize={home.subtextTextSize}
            />
          </div>
          <HomepageGrid items={home.gridItems} />
        </div>
      </main>
    </SiteShell>
  );
}
