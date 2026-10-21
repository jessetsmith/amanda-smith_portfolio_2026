"use client";

import Link from "next/link";
import { HazyNav } from "@/components/HazyNav";
import { SiteShell } from "@/components/SiteShell";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { CV_HERO_VIDEO } from "@/lib/cv";
import type { CvPageContent, SiteSettings } from "@/types/content";

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
  // Always the local intro file — never homepage hero / YouTube.
  const videoSrc = CV_HERO_VIDEO;

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
          <video
            className="cv-hero__media"
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
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
