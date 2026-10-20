"use client";

import type { CSSProperties } from "react";
import { DefinitionText } from "@/components/DefinitionText";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { resolveLocale, type LocaleString } from "@/lib/i18n/resolve";
import type { CellTextSize } from "@/types/grid";

/** Homepage grid intro — localized; definition hotspots only fire on English phrases. */
export function GridIntroBlurb({
  className,
  text,
  textColor,
  textSize,
}: {
  className?: string;
  /** From homepageHero.subtext; falls back to uiCopy.gridIntro when unset/empty map. */
  text?: LocaleString | null;
  textColor?: string;
  textSize?: CellTextSize;
}) {
  const { locale, ui } = useLocale();
  // Hero subtext is source of truth; uiCopy.gridIntro only if prop omitted.
  const copy =
    text == null ? ui("gridIntro") : resolveLocale(text, locale);

  if (!copy) return null;

  const sizeAttr =
    textSize && textSize !== "md" ? textSize : undefined;
  const style = (
    textColor
      ? ({ ["--intro-subtext-color" as string]: textColor } as CSSProperties)
      : undefined
  );

  return (
    <DefinitionText
      className={["grid-intro-blurb", className].filter(Boolean).join(" ")}
      text={copy}
      data-text-size={sizeAttr}
      style={style}
    />
  );
}
