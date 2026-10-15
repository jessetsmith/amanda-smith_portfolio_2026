"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import type { UiCopyDoc } from "@/lib/i18n/ui-copy";

/** Client shell so locale persists across public pages. */
export function SiteShell({
  children,
  uiCopy,
}: {
  children: ReactNode;
  uiCopy?: UiCopyDoc | null;
}) {
  return <LocaleProvider uiCopy={uiCopy}>{children}</LocaleProvider>;
}
