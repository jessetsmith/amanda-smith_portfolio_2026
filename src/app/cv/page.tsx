import type { ReactNode } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { getCvData, getSiteSettings } from "@/lib/content";
import { HazyNav } from "@/components/HazyNav";

export const metadata = {
  title: "CV | Amanda Smith",
  description: "Curriculum vitae — Amanda Smith",
};

export default async function CvPage() {
  if (process.env.GITHUB_PAGES !== "1") {
    await connection();
  }
  const [cv, site] = await Promise.all([getCvData(), getSiteSettings()]);

  return (
    <>
      <HazyNav brand={site.siteTitle} items={site.nav} />
      <main className="cv-page mx-auto w-full max-w-[52rem] px-4 pb-24 pt-10 sm:px-6 md:px-8">
        <header className="border-b border-ink/20 pb-8">
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-rust uppercase">
            Curriculum vitae · {cv.source}
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">
            {cv.name}
          </h1>
          <p className="mt-2 text-lg text-ink/70">{cv.headline}</p>
          <p className="mt-4 text-sm text-ink/60">
            {[cv.location, cv.email, cv.phone, cv.relocationNote]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {cv.summary ? (
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/75">
              {cv.summary}
            </p>
          ) : null}
        </header>

        <CvSection title="Key expertise">
          <ul className="flex flex-wrap gap-x-3 gap-y-2">
            {cv.expertiseTags.map((tag) => (
              <li
                key={tag}
                className="font-mono text-[0.7rem] tracking-[0.12em] text-ink/70 uppercase"
              >
                {tag}
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-2 text-sm text-ink/75">
            {cv.expertiseHighlights.map((item) => (
              <li key={item.text}>— {item.text}</li>
            ))}
          </ul>
        </CvSection>

        <CvSection title="Experience">
          <ul className="space-y-5">
            {cv.experience.map((item) => (
              <li key={`${item.title}-${item.org}`}>
                <p className="font-display text-lg text-ink">{item.title}</p>
                <p className="text-sm text-ink/65">
                  {item.org}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
                <p className="font-mono text-[0.65rem] tracking-[0.1em] text-ink/45 uppercase">
                  {formatRange(item.startDate, item.endDate, item.current)}
                </p>
                {item.summary ? (
                  <p className="mt-1 text-sm text-ink/70">{item.summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title="Awards">
          <ul className="space-y-3">
            {cv.awards.map((item) => (
              <li key={item.title}>
                <p className="text-ink">{item.title}</p>
                <p className="text-sm text-ink/60">
                  {item.org}
                  {item.date ? ` · ${item.date}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title="Speaking">
          <ul className="space-y-3">
            {cv.speaking.map((item) => (
              <li key={item.eventTitle}>
                <p className="text-ink">{item.eventTitle}</p>
                <p className="text-sm text-ink/60">
                  {[item.role, item.org, item.date].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title="Education">
          <ul className="space-y-3">
            {cv.education.map((item) => (
              <li key={`${item.title}-${item.institution}`}>
                <p className="text-ink">{item.title}</p>
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

        <CvSection title="Skills">
          <p className="text-sm leading-relaxed text-ink/75">
            {cv.technicalSkills.join(" · ")}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-ink/70">
            {cv.languages.map((item) => (
              <li key={item.language}>
                {item.language} — {item.level}
              </li>
            ))}
          </ul>
        </CvSection>

        <CvSection title="Publications">
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
            ← Back to portfolio
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
): string {
  if (!start && !end && !current) return "";
  if (current) return `${start ?? ""}–Present`.replace(/^–/, "");
  if (start && end) return `${start}–${end}`;
  return start || end || "";
}
