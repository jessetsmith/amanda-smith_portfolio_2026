import type { GridItem } from "@/types/grid";
import { fillClass, gridPlacementStyle } from "@/lib/grid";

interface GridCellProps {
  item: GridItem;
}

export function GridCell({ item }: GridCellProps) {
  const style = gridPlacementStyle(item);
  const base =
    "grid-cell relative flex flex-col justify-between gap-4 p-6 sm:p-8 md:p-9";

  switch (item.kind) {
    case "titleRow":
      return (
        <div
          className={`${base} title-row items-start justify-center !py-4`}
          style={style}
          data-kind={item.kind}
        >
          <p className="font-mono text-[0.7rem] tracking-[0.22em] text-ink uppercase">
            <span className="mr-2 inline-block h-1.5 w-1.5 bg-ink align-middle" />
            {item.label}
          </p>
        </div>
      );

    case "colorCell":
      return (
        <div
          className={`${base} ${fillClass(item.fill)} color-cell`}
          style={style}
          data-kind={item.kind}
        >
          {item.label ? (
            <span className="font-mono text-[0.65rem] tracking-[0.18em] uppercase opacity-80">
              {item.label}
            </span>
          ) : (
            <span className="sr-only">Color cell</span>
          )}
        </div>
      );

    case "mediaCell":
      return (
        <div
          className={`${base} media-cell`}
          style={style}
          data-kind={item.kind}
          data-tone={item.placeholderTone ?? "warm"}
        >
          <div className="media-placeholder">
            <span className="font-mono text-[0.65rem] tracking-[0.18em] text-ink/55 uppercase">
              {item.caption ?? "Media"}
            </span>
          </div>
        </div>
      );

    case "textCell":
      return (
        <article
          className={`${base} text-cell`}
          style={style}
          data-kind={item.kind}
        >
          {item.meta ? (
            <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink/50 uppercase">
              {item.meta}
            </p>
          ) : null}
          <div className="mt-auto max-w-2xl space-y-3">
            <h2 className="font-display text-2xl leading-[1.15] tracking-tight text-ink sm:text-3xl md:text-4xl">
              {item.headline}
            </h2>
            {item.excerpt ? (
              <p className="text-base leading-relaxed text-ink/70 sm:text-lg">
                {item.excerpt}
              </p>
            ) : null}
          </div>
        </article>
      );

    case "projectCell":
      return (
        <article
          className={`${base} project-cell`}
          style={style}
          data-kind={item.kind}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink/50 uppercase">
              Project
            </p>
            {item.year ? (
              <p className="font-mono text-[0.65rem] tracking-[0.12em] text-ink/45">
                {item.year}
              </p>
            ) : null}
          </div>
          <div className="mt-auto max-w-2xl space-y-2">
            <h2 className="font-display text-2xl leading-[1.15] tracking-tight text-ink sm:text-3xl md:text-4xl">
              {item.title}
            </h2>
            {item.summary ? (
              <p className="text-base leading-relaxed text-ink/65 sm:text-lg">
                {item.summary}
              </p>
            ) : null}
          </div>
        </article>
      );
  }
}
