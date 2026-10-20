"use client";

import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { patchLocale } from "@/lib/i18n/display";
import type { LocaleString } from "@/lib/i18n/resolve";

/** Compact language switcher for admin Hero / Content editors. */
export function AdminLocaleSelect({
  value,
  onChange,
}: {
  value: LocaleCode;
  onChange: (locale: LocaleCode) => void;
}) {
  return (
    <label className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[0.6rem] tracking-[0.12em] text-ink/55 uppercase">
        Editing language
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LocaleCode)}
        className="border border-ink/20 bg-paper px-2 py-1.5 font-mono text-xs text-ink"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_SHORT[code]} — {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
      <span className="text-xs text-ink/45">
        Other locales stay intact. Clearing a language leaves that locale blank
        (no autofill from another language). Full multi-locale editing also
        lives in <code className="font-mono">/studio</code>.
      </span>
    </label>
  );
}

/** Admin input value for one locale — never falls back to siblings (avoids refill). */
export function readLocaleField(
  value: LocaleString | null | undefined,
  locale: LocaleCode,
): string {
  if (value == null) return "";
  if (typeof value === "string") {
    return locale === "en" ? value : "";
  }
  if (Object.prototype.hasOwnProperty.call(value, locale)) {
    return (value[locale] ?? "").trim();
  }
  return "";
}

export function writeLocaleField(
  current: LocaleString | null | undefined,
  locale: LocaleCode,
  next: string,
): LocaleString {
  return patchLocale(current, locale, next);
}
