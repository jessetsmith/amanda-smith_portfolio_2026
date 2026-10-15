import { DEFAULT_LOCALE, type LocaleCode } from "@/lib/i18n/locales";
import {
  resolveLocale,
  setLocaleValue,
  toLocaleMap,
  type LocaleString,
} from "@/lib/i18n/resolve";

/** English (or fallback) for admin lists, signatures, and EN-first edits. */
export function enOf(value: LocaleString | null | undefined): string {
  return resolveLocale(value, DEFAULT_LOCALE);
}

export function localeOf(
  value: LocaleString | null | undefined,
  locale: LocaleCode,
): string {
  return resolveLocale(value, locale);
}

export function patchLocale(
  current: LocaleString | null | undefined,
  locale: LocaleCode,
  next: string,
): LocaleString {
  return setLocaleValue(current, locale, next);
}

export function ensureLocaleMap(
  value: LocaleString | null | undefined,
): Partial<Record<LocaleCode, string>> {
  return toLocaleMap(value);
}
