"use client";

import Link from "next/link";
import { HazyNav } from "@/components/HazyNav";
import { SiteShell } from "@/components/SiteShell";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveHeroMedia, resolveHeroPoster } from "@/lib/hero-media";
import type { CvPageContent, SiteSettings } from "@/types/content";

const INTRO_MP4 = "/media/intro.mp4";

export function CvPageClient({
  cv,
  site,
}: {
  cv: CvPageContent;
  site: SiteSettings;
}) {
  return (
    <SiteShell uiCopy={cv.uiCopy}>
      <CvView cv={cv} site={site} />
    </SiteShell>
  );
}

function CvView({ cv, site }: { cv: CvPageContent; site: SiteSettings }) {
  const { ui } = useLocale();
  const eyebrow = ui("cvEyebrow") || "CV";
  const media = resolveHeroMedia(cv.videoSrc || INTRO_MP4);
  const poster =
    resolveHeroPoster(cv.posterSrc, undefined, media.youtubeId) || cv.posterSrc;

  return (
    <>
      <HazyNav
        brand={site.siteTitle}
        items={site.nav}
        textColor={site.navTextColor}
        textSize={site.navTextSize}
      />
      <main className="cv-page">
        <section className="cv-hero" aria-label={eyebrow}>
          {media.kind === "youtube" && media.youtubeId ? (
            <iframe
              className="cv-hero__media cv-hero__media--yt"
              src={`https://www.youtube-nocookie.com/embed/${media.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${media.youtubeId}&playsinline=1&rel=0&modestbranding=1`}
              title=""
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen={false}
              tabIndex={-1}
            />
          ) : (
            <video
              className="cv-hero__media"
              src={media.videoUrl || INTRO_MP4}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          )}
          <div className="cv-hero__veil" aria-hidden />
          <div className="cv-hero__copy">
            <p className="cv-hero__eyebrow">{eyebrow}</p>
            <h1 className="cv-hero__title">Amanda Smith</h1>
          </div>
        </section>

        <section className="cv-pdf" aria-label="Curriculum vitae PDF">
          <div className="cv-pdf__toolbar">
            <p className="cv-pdf__filename">{cv.pdfFilename}</p>
            <div className="cv-pdf__actions">
              <a
                className="cv-pdf__btn"
                href={cv.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open
              </a>
              <a
                className="cv-pdf__btn cv-pdf__btn--primary"
                href={cv.pdfUrl}
                download={cv.pdfFilename}
              >
                Download PDF
              </a>
            </div>
          </div>

          <div className="cv-pdf__frame-wrap">
            <iframe
              className="cv-pdf__frame"
              src={`${cv.pdfUrl}#view=FitH`}
              title={`${cv.pdfFilename} viewer`}
            />
          </div>

          <p className="cv-pdf__mobile-hint">
            Prefer a native reader?{" "}
            <a href={cv.pdfUrl} target="_blank" rel="noopener noreferrer">
              Open the PDF
            </a>{" "}
            or download above.
          </p>

          <p className="cv-pdf__back">
            <Link href="/">{ui("backToPortfolio") || "Back to portfolio"}</Link>
          </p>
        </section>
      </main>
    </>
  );
}
