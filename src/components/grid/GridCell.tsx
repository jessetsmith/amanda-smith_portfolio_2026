import type { CSSProperties, ElementType, ReactNode } from "react";
import type { GridItem, PlaceholderTone } from "@/types/grid";
import { useLocaleOptional } from "@/components/i18n/LocaleProvider";
import { fillClass, gridPlacementStyle } from "@/lib/grid";

interface GridCellProps {
  item: GridItem;
  /** When true, skip CSS grid placement (parent owns placement — used by admin DnD). */
  omitPlacement?: boolean;
  /**
   * Public homepage: wrap linked cells as external anchors.
   * Admin canvas keeps this false so select/drag/edit never navigate.
   */
  enableLinks?: boolean;
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

function itemHref(item: GridItem): string | undefined {
  if (!("href" in item)) return undefined;
  const href = item.href?.trim();
  return href || undefined;
}

function OpenCue() {
  const { ui } = useLocaleOptional();
  return (
    <span className="card-open font-mono tracking-[0.16em] text-ink/45 uppercase">
      {ui("open")}
      <span className="card-open__arrow" aria-hidden>
        ↗
      </span>
    </span>
  );
}

function CellShell({
  item,
  enableLinks,
  className,
  style,
  children,
  kindClass,
  as = "article",
}: {
  item: GridItem;
  enableLinks: boolean;
  className: string;
  style: CSSProperties;
  children: ReactNode;
  kindClass: string;
  as?: ElementType;
}) {
  const href = enableLinks ? itemHref(item) : undefined;
  const linked = Boolean(href);
  const Comp: ElementType = linked ? "a" : as;
  const linkProps = linked
    ? {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
      }
    : {};

  return (
    <Comp
      className={`${kindClass}${linked ? " grid-cell-link" : ""} ${className}`.trim()}
      style={style}
      data-kind={item.kind}
      data-featured={
        "featured" in item && item.featured ? "true" : undefined
      }
      data-linked={linked ? "true" : undefined}
      {...linkProps}
    >
      {children}
      {linked ? <OpenCue /> : null}
    </Comp>
  );
}

export function GridCell({
  item,
  omitPlacement = false,
  enableLinks = true,
  className = "",
  style: styleOverride,
}: GridCellProps) {
  const { t, ui } = useLocaleOptional();
  const style = {
    ...(omitPlacement ? {} : gridPlacementStyle(item)),
    ...styleOverride,
  };
  const base = `grid-cell relative ${className}`.trim();
  const leadMark = (
    <span className="card-featured-mark"> · {ui("lead")}</span>
  );

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
            {t(item.label)}
          </p>
        </div>
      );

    case "colorCell": {
      const href = enableLinks ? itemHref(item) : undefined;
      const linked = Boolean(href);
      const Comp: ElementType = linked ? "a" : "div";
      const linkProps = linked
        ? {
            href,
            target: "_blank",
            rel: "noopener noreferrer",
          }
        : {};
      const label = t(item.label);
      return (
        <Comp
          className={`${base} ${fillClass(item.fill)} color-cell flex flex-col justify-between p-6 sm:p-8${
            linked ? " grid-cell-link" : ""
          }`}
          style={style}
          data-kind={item.kind}
          data-linked={linked ? "true" : undefined}
          {...linkProps}
        >
          {label ? (
            <span className="font-mono text-[0.65rem] tracking-[0.18em] uppercase opacity-80">
              <MetaDot />
              {label}
            </span>
          ) : (
            <span className="sr-only">{ui("colorCell")}</span>
          )}
          {linked ? <OpenCue /> : null}
        </Comp>
      );
    }

    case "blankCell":
      return (
        <div
          className={`${base} blank-cell`}
          style={style}
          data-kind={item.kind}
          aria-hidden
        />
      );

    case "mediaCell": {
      const meta = t(item.meta) || t(item.caption) || ui("media");
      const title = t(item.title);
      const caption = t(item.caption);
      const description = t(item.description);
      const alt = t(item.imageAlt) || title || caption;
      return (
        <CellShell
          item={item}
          enableLinks={enableLinks}
          className={className}
          style={style}
          kindClass={contentCardClass(item, "media-cell")}
        >
          <p className="card-meta font-mono tracking-[0.18em] text-ink uppercase">
            <MetaDot />
            {meta}
            {item.featured ? leadMark : null}
          </p>
          {title ? (
            <h2 className="card-title font-display text-ink">{title}</h2>
          ) : null}
          <CardImage
            src={item.imageSrc}
            alt={alt}
            tone={item.placeholderTone ?? "warm"}
            label={caption || ui("image")}
          />
          {description ? (
            <p className="card-desc leading-relaxed text-ink/70">
              {description}
            </p>
          ) : null}
        </CellShell>
      );
    }

    case "textCell": {
      const meta = t(item.meta);
      const headline = t(item.headline);
      const subtitle = t(item.subtitle);
      const excerpt = t(item.excerpt);
      const alt = t(item.imageAlt) || headline;
      return (
        <CellShell
          item={item}
          enableLinks={enableLinks}
          className={className}
          style={style}
          kindClass={contentCardClass(item, "text-cell")}
        >
          {meta ? (
            <p className="card-meta font-mono tracking-[0.18em] text-ink uppercase">
              <MetaDot />
              {meta}
              {item.featured ? leadMark : null}
            </p>
          ) : null}
          <h2 className="card-title font-display text-ink">{headline}</h2>
          {subtitle ? (
            <p className="card-subtitle leading-snug text-ink/55">
              {subtitle}
            </p>
          ) : null}
          <CardImage
            src={item.imageSrc}
            alt={alt}
            tone={item.placeholderTone ?? "warm"}
            label={ui("image")}
          />
          {excerpt ? (
            <p className="card-desc leading-relaxed text-ink/70">{excerpt}</p>
          ) : null}
        </CellShell>
      );
    }

    case "projectCell": {
      const meta = t(item.meta) || ui("project");
      const title = t(item.title);
      const subtitle = t(item.subtitle);
      const summary = t(item.summary);
      const alt = t(item.imageAlt) || title;
      return (
        <CellShell
          item={item}
          enableLinks={enableLinks}
          className={className}
          style={style}
          kindClass={contentCardClass(item, "project-cell")}
        >
          <div className="card-meta flex items-baseline justify-between gap-3">
            <p className="font-mono tracking-[0.18em] text-ink uppercase">
              <MetaDot />
              {meta}
              {item.featured ? leadMark : null}
            </p>
            {item.year ? (
              <p className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/45">
                {item.year}
              </p>
            ) : null}
          </div>
          <h2 className="card-title font-display text-ink">{title}</h2>
          {subtitle ? (
            <p className="card-subtitle leading-snug text-ink/55">
              {subtitle}
            </p>
          ) : null}
          <CardImage
            src={item.imageSrc}
            alt={alt}
            tone={item.placeholderTone ?? "cool"}
            label={ui("image")}
          />
          {summary ? (
            <p className="card-desc leading-relaxed text-ink/65">{summary}</p>
          ) : null}
        </CellShell>
      );
    }
  }
}
