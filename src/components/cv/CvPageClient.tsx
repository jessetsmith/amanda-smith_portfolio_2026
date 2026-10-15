"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { HazyNav } from "@/components/HazyNav";
import { SiteShell } from "@/components/SiteShell";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { CvData, SiteSettings } from "@/types/content";

export function CvPageClient({
  cv,
  site,
}: {
  cv: CvData;
  site: SiteSettings;
}) {
  return (
    <SiteShell uiCopy={cv.uiCopy}>
      <CvView cv={cv} site={site} />
    </SiteShell>
  );
}

function CvView({ cv, site }: { cv: CvData; site: SiteSettings }) {
  const { t, ui } = useLocale();

  return (
    <>
      <HazyNav brand={site.siteTitle} items={site.nav} />
      <main className="cv-page mx-auto w-full max-w-[52rem] px-4 pb-24 pt-10 sm:px-6 md:px-8">
        <header className="border-b border-ink/20 pb-8">
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-rust uppercase">
            {ui("cvEyebrow")} · {cv.source}
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">
            {cv.name}
          </h1>
          <p className="mt-2 text-lg text-ink/70">{t(cv.headline)}</p>
          <div className="cv-page__meta">
            {[t(cv.location), cv.email, cv.phone, t(cv.relocationNote)]
              .filter(Boolean)
              .map((part) => (
                <span key={part} className="cv-page__meta-item">
                  {part}
                </span>
              ))}
          </div>
          {t(cv.summary) ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/75">
              {t(cv.summary)}
            </p>
          ) : null}
        </header>

        <CvSection title={ui("cvExpertise")}>
          <ul className="flex flex-wrap gap-x-3 gap-y-2">
            {cv.expertiseTags.map((tag, i) => (
              <li
                key={`${t(tag)}-${i}`}
                className="font-mono text-[0.7rem] tracking-[0.12em] text-ink/70 uppercase"
              >
                {t(tag)}
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-2 text-sm text-ink/75">
            {cv.expertiseHighlights.map((item, i) => (
              <li key={`${t(item.text)}-${i}`}>— {t(item.text)}</li>
            ))}
          </ul>
        </CvSection>

        <CvSection title={ui("cvExperience")}>
          <ul className="space-y-5">
            {cv.experience.map((item, i) => (
              <li key={`${t(item.title)}-${item.org}-${i}`}>
                <p className="font-display text-lg text-ink">{t(item.title)}</p>
                <p className="text-sm text-ink/65">
                  {item.org}
                  {t(item.location) ? ` · ${t(item.location)}` : ""}
                </p>
                <p className="font-mono text-[0.65rem] tracking-[0.1em] text-ink/45 uppercase">
                  {formatRange(
                    item.startDate,
                    item.endDate,
                    item.current,
                    ui("present"),
                  )}
                </p>
                {t(item.summary) ? (
                  <p className="mt-1 text-sm text-ink/70">{t(item.summary)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title={ui("cvAwards")}>
          <ul className="space-y-3">
            {cv.awards.map((item, i) => (
              <li key={`${t(item.title)}-${i}`}>
                <p className="text-ink">{t(item.title)}</p>
                <p className="text-sm text-ink/60">
                  {item.org}
                  {item.date ? ` · ${item.date}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title={ui("cvSpeaking")}>
          <ul className="space-y-3">
            {cv.speaking.map((item, i) => (
              <li key={`${t(item.eventTitle)}-${i}`}>
                <p className="text-ink">{t(item.eventTitle)}</p>
                <p className="text-sm text-ink/60">
                  {[item.role, item.org, item.date].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title={ui("cvEducation")}>
          <ul className="space-y-3">
            {cv.education.map((item, i) => (
              <li key={`${t(item.title)}-${item.institution}-${i}`}>
                <p className="text-ink">{t(item.title)}</p>
                <p className="text-sm text-ink/60">
                  {item.institution}
                  {item.startYear || item.endYear
                    ? ` · ${[item.startYear, item.endYear].filter(Boolean).join("–")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title={ui("cvSkills")}>
          <p className="text-sm leading-relaxed text-ink/75">
            {cv.technicalSkills.map((s) => t(s)).filter(Boolean).join(" · ")}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-ink/70">
            {cv.languages.map((item, i) => (
              <li key={`${t(item.language)}-${i}`}>
                {t(item.language)} — {t(item.level)}
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title={ui("cvPublications")}>
          <ul className="space-y-2">
            {cv.publications.map((item) => (
              <li key={item.title} className="text-sm text-ink/80">
                {item.url ? (
                  <a href={item.url} className="underline decoration-ink/25">
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
                <span className="text-ink/50">
                  {item.venue ? ` — ${item.venue}` : ""}
                  {item.date ? ` (${item.date})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </CvSection>

        <p className="mt-12 text-sm text-ink/50">
          <Link href="/" className="underline decoration-ink/25">
            {ui("backToPortfolio")}
          </Link>
        </p>
      </main>
    </>
  );
}

function CvSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-ink/15 py-8">
      <h2 className="font-mono text-[0.7rem] tracking-[0.2em] text-ink/50 uppercase">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatRange(
  start?: string,
  end?: string,
  current?: boolean,
  presentLabel = "Present",
): string {
  if (!start && !end && !current) return "";
  if (current) return `${start ?? ""}–${presentLabel}`.replace(/^–/, "");
  if (start && end) return `${start}–${end}`;
  return start || end || "";
}
