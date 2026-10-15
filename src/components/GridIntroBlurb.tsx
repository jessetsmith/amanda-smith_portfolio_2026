"use client";

import { DefinitionText } from "@/components/DefinitionText";
import { useLocale } from "@/components/i18n/LocaleProvider";

/** Homepage grid intro — localized; definition hotspots only fire on English phrases. */
export function GridIntroBlurb({ className }: { className?: string }) {
  const { ui } = useLocale();
  return <DefinitionText className={className} text={ui("gridIntro")} />;
}
