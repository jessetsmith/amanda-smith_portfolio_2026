export const LOCALES = ["en", "es", "it", "pt", "fr", "de"] as const;

export type LocaleCode = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALE_STORAGE_KEY = "amanda-portfolio-locale";

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: "English",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

export const LOCALE_SHORT: Record<LocaleCode, string> = {
  en: "EN",
  es: "ES",
  it: "IT",
  pt: "PT",
  fr: "FR",
  de: "DE",
};

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: unknown): LocaleCode {
  return isLocaleCode(value) ? value : DEFAULT_LOCALE;
}
