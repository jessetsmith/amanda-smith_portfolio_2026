import {
  DEFAULT_LOCALE,
  LOCALES,
  type LocaleCode,
} from "@/lib/i18n/locales";

/**
 * Plain string (legacy / EN-only) or per-locale map from Sanity.
 * Missing locales fall back to English, then any available value.
 */
export type LocaleString = string | Partial<Record<LocaleCode, string>>;

export type LocaleText = LocaleString;

export function isLocaleMap(
  value: unknown,
): value is Partial<Record<LocaleCode, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  // Sanity objects may include `_type` / `_key` — only require at least one locale key.
  return LOCALES.some((code) => typeof record[code] === "string");
}

/** Normalize API/fixture values into a locale map (plain string → { en }). */
export function toLocaleMap(
  value: unknown,
  fallbackEn = "",
): Partial<Record<LocaleCode, string>> {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { en: trimmed } : fallbackEn ? { en: fallbackEn } : {};
  }
  if (isLocaleMap(value)) {
    const record = value as Record<string, unknown>;
    const out: Partial<Record<LocaleCode, string>> = {};
    for (const code of LOCALES) {
      const raw = record[code];
      if (typeof raw === "string" && raw.trim()) out[code] = raw.trim();
    }
    if (!out.en && fallbackEn) out.en = fallbackEn;
    return out;
  }
  return fallbackEn ? { en: fallbackEn } : {};
}

/** Pick copy for the active locale with English (then any) fallback. */
export function resolveLocale(
  value: LocaleString | null | undefined,
  locale: LocaleCode = DEFAULT_LOCALE,
): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  const preferred = value[locale]?.trim();
  if (preferred) return preferred;
  const en = value[DEFAULT_LOCALE]?.trim();
  if (en) return en;
  for (const code of LOCALES) {
    const next = value[code]?.trim();
    if (next) return next;
  }
  return "";
}

/** Merge overlay locales onto a base map (overlay wins per key). */
export function mergeLocaleMaps(
  base: unknown,
  overlay: unknown,
): Partial<Record<LocaleCode, string>> {
  const a = toLocaleMap(base);
  const b = toLocaleMap(overlay);
  return { ...a, ...b };
}

/** Set one locale on a value, preserving siblings. */
export function setLocaleValue(
  current: LocaleString | null | undefined,
  locale: LocaleCode,
  next: string,
): Partial<Record<LocaleCode, string>> {
  const map = toLocaleMap(current);
  const trimmed = next.trim();
  if (trimmed) map[locale] = trimmed;
  else delete map[locale];
  return map;
}
