import {
  DEFAULT_LOCALE,
  LOCALES,
  type LocaleCode,
} from "@/lib/i18n/locales";

/**
 * Plain string (legacy / EN-only) or per-locale map from Sanity.
 * Missing locale keys fall back to English, then any non-empty value.
 * Explicit empty strings (`""`) mean intentional blank — no cross-locale refill.
 */
export type LocaleString = string | Partial<Record<LocaleCode, string>>;

export type LocaleText = LocaleString;

function hasLocaleKey(
  value: Partial<Record<LocaleCode, string>>,
  locale: LocaleCode,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, locale);
}

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
      if (!Object.prototype.hasOwnProperty.call(record, code)) continue;
      const raw = record[code];
      if (typeof raw !== "string") continue;
      // Preserve intentional empties (`""`); keep mid-typing spaces
      // (trim only all-whitespace → blank). Trailing Space must survive edits.
      out[code] = raw.trim() === "" ? "" : raw;
    }
    if (!hasLocaleKey(out, DEFAULT_LOCALE) && fallbackEn) {
      out.en = fallbackEn;
    }
    return out;
  }
  return fallbackEn ? { en: fallbackEn } : {};
}

/**
 * Pick copy for the active locale.
 * Explicit empty for a locale (or EN) stays blank — never refill from siblings.
 */
export function resolveLocale(
  value: LocaleString | null | undefined,
  locale: LocaleCode = DEFAULT_LOCALE,
): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();

  if (hasLocaleKey(value, locale)) {
    return (value[locale] ?? "").trim();
  }
  if (locale !== DEFAULT_LOCALE && hasLocaleKey(value, DEFAULT_LOCALE)) {
    return (value[DEFAULT_LOCALE] ?? "").trim();
  }

  // Preferred + EN keys absent: legacy fallback to any non-empty locale.
  for (const code of LOCALES) {
    if (!hasLocaleKey(value, code)) continue;
    const next = (value[code] ?? "").trim();
    if (next) return next;
  }
  return "";
}

/**
 * Merge overlay locales onto a base map.
 * Base wins per key (including intentional empties); overlay only fills missing keys.
 */
export function mergeLocaleMaps(
  base: unknown,
  overlay: unknown,
): Partial<Record<LocaleCode, string>> {
  const a = toLocaleMap(base);
  const b = toLocaleMap(overlay);
  const out: Partial<Record<LocaleCode, string>> = { ...a };
  for (const code of LOCALES) {
    if (!hasLocaleKey(out, code) && hasLocaleKey(b, code) && b[code]) {
      out[code] = b[code];
    }
  }
  return out;
}

/**
 * Set one locale on a value, preserving siblings.
 * All-whitespace → intentional blank `""`.
 * Otherwise keep the raw string (including spaces) so inputs don’t eat Space mid-typing.
 */
export function setLocaleValue(
  current: LocaleString | null | undefined,
  locale: LocaleCode,
  next: string,
): Partial<Record<LocaleCode, string>> {
  const map = toLocaleMap(current);
  map[locale] = next.trim() === "" ? "" : next;
  return map;
}
