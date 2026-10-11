import type { CSSProperties } from "react";
import type { GridItem, PlaceholderTone } from "@/types/grid";
import { fillClass, gridPlacementStyle } from "@/lib/grid";

interface GridCellProps {
  item: GridItem;
  /** When true, skip CSS grid placement (parent owns placement — used by admin DnD). */
  omitPlacement?: boolean;
  className?: string;
  style?: CSSProperties;
}

function MetaDot({ muted = false }: { muted?: boolean }) {
  return (
    <span
      className={`mr-2 inline-block h-1.5 w-1.5 align-middle ${
        muted ? "bg-ink/40" : "bg-ink"
      }`}
      aria-hidden
    />
  );
}

function CardImage({
  src,
  alt,
  tone = "warm",
  label,
}: {
  src?: string;
  alt?: string;
  tone?: PlaceholderTone;
  label?: string;
}) {
  if (src) {
    return (
      <div className="card-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || ""} className="card-image__media" />
      </div>
    );
  }

  return (
    <div className="card-image" data-tone={tone}>
      <div className="card-image__placeholder">
        {label ? (
          <span className="font-mono text-[0.65rem] tracking-[0.16em] text-ink/45 uppercase">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function contentCardClass(item: GridItem, kindClass: string): string {
  const featured =
    "featured" in item && item.featured ? " content-card--featured" : "";
  return `grid-cell relative content-card ${kindClass}${featured}`;
}

export function GridCell({
  item,
  omitPlacement = false,
  className = "",
  style: styleOverride,
}: GridCellProps) {
  const style = {
    ...(omitPlacement ? {} : gridPlacementStyle(item)),
    ...styleOverride,
  };
  const base = `grid-cell relative ${className}`.trim();

  switch (item.kind) {
    case "titleRow":
      return (
        <div
          className={`${base} title-row flex items-center px-6 py-4 sm:px-8`}
          style={style}
          data-kind={item.kind}
        >
          <p className="font-mono text-[0.7rem] tracking-[0.22em] text-ink uppercase">
            <MetaDot />
            {item.label}
          </p>
        </div>
      );

    case "colorCell":
      return (
        <div
          className={`${base} ${fillClass(item.fill)} color-cell flex flex-col justify-between p-6 sm:p-8`}
          style={style}
          data-kind={item.kind}
        >
          {item.label ? (
            <span className="font-mono text-[0.65rem] tracking-[0.18em] uppercase opacity-80">
              <MetaDot />
              {item.label}
            </span>
          ) : (
            <span className="sr-only">Color cell</span>
          )}
        </div>
      );

    case "blankCell":
      return (
        <div
          className={`${base} blank-cell`}
          style={style}
          data-kind={item.kind}
          aria-hidden
        />
      );

    case "mediaCell":
      return (
        <article
          className={`${contentCardClass(item, "media-cell")} ${className}`.trim()}
          style={style}
          data-kind={item.kind}
          data-featured={item.featured ? "true" : undefined}
        >
          <p className="card-meta font-mono tracking-[0.18em] text-ink uppercase">
            <MetaDot />
            {item.meta || item.caption || "Media"}
            {item.featured ? (
              <span className="card-featured-mark"> · Lead</span>
            ) : null}
          </p>
          {item.title ? (
            <h2 className="card-title font-display text-ink">
              {item.title}
            </h2>
          ) : null}
          <CardImage
            src={item.imageSrc}
            alt={item.imageAlt || item.title || item.caption}
            tone={item.placeholderTone ?? "warm"}
            label={item.caption || "Image"}
          />
          {item.description ? (
            <p className="card-desc leading-relaxed text-ink/70">
              {item.description}
            </p>
          ) : null}
        </article>
      );

    case "textCell":
      return (
        <article
          className={`${contentCardClass(item, "text-cell")} ${className}`.trim()}
          style={style}
          data-kind={item.kind}
          data-featured={item.featured ? "true" : undefined}
        >
          {item.meta ? (
            <p className="card-meta font-mono tracking-[0.18em] text-ink uppercase">
              <MetaDot />
              {item.meta}
              {item.featured ? (
                <span className="card-featured-mark"> · Lead</span>
              ) : null}
            </p>
          ) : null}
          <h2 className="card-title font-display text-ink">{item.headline}</h2>
          {item.subtitle ? (
            <p className="card-subtitle leading-snug text-ink/55">
              {item.subtitle}
            </p>
          ) : null}
          <CardImage
            src={item.imageSrc}
            alt={item.imageAlt || item.headline}
            tone={item.placeholderTone ?? "warm"}
            label="Image"
          />
          {item.excerpt ? (
            <p className="card-desc leading-relaxed text-ink/70">{item.excerpt}</p>
          ) : null}
        </article>
      );

    case "projectCell":
      return (
        <article
          className={`${contentCardClass(item, "project-cell")} ${className}`.trim()}
          style={style}
          data-kind={item.kind}
          data-featured={item.featured ? "true" : undefined}
        >
          <div className="card-meta flex items-baseline justify-between gap-3">
            <p className="font-mono tracking-[0.18em] text-ink uppercase">
              <MetaDot />
              {item.meta || "Project"}
              {item.featured ? (
                <span className="card-featured-mark"> · Lead</span>
              ) : null}
            </p>
            {item.year ? (
              <p className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/45">
                {item.year}
              </p>
            ) : null}
          </div>
          <h2 className="card-title font-display text-ink">{item.title}</h2>
          {item.subtitle ? (
            <p className="card-subtitle leading-snug text-ink/55">
              {item.subtitle}
            </p>
          ) : null}
          <CardImage
            src={item.imageSrc}
            alt={item.imageAlt || item.title}
            tone={item.placeholderTone ?? "cool"}
            label="Image"
          />
          {item.summary ? (
            <p className="card-desc leading-relaxed text-ink/65">{item.summary}</p>
          ) : null}
        </article>
      );
  }
}
