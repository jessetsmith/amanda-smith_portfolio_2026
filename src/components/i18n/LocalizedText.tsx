"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import type { LocaleString } from "@/lib/i18n/resolve";
import type { UiCopyKey } from "@/lib/i18n/ui-copy";

/** Resolve a locale map or UI chrome key in client trees. */
export function LocalizedText({
  value,
  uiKey,
}: {
  value?: LocaleString | null;
  uiKey?: UiCopyKey;
}) {
  const { t, ui } = useLocale();
  if (uiKey) return <>{ui(uiKey)}</>;
  return <>{t(value)}</>;
}
