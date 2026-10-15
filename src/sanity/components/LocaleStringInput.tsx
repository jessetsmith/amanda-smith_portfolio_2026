"use client";

import { useCallback, useMemo, useState } from "react";
import { set, unset, type ObjectInputProps } from "sanity";
import {
  LOCALES,
  LOCALE_LABELS,
  type LocaleCode,
} from "@/lib/i18n/locales";

type LocaleObject = Partial<Record<LocaleCode, string>>;

/**
 * Studio language switcher — edit one locale at a time instead of six stacked fields.
 */
export function LocaleStringInput(props: ObjectInputProps) {
  const { value, onChange, schemaType } = props;
  const [locale, setLocale] = useState<LocaleCode>("en");
  const raw = (value as (LocaleObject & { _type?: string }) | undefined) || {};
  const map: LocaleObject = {};
  for (const code of LOCALES) {
    if (typeof raw[code] === "string") map[code] = raw[code];
  }

  const isText = useMemo(() => {
    const field = schemaType.fields?.find((f) => f.name === "en");
    return field?.type?.name === "text";
  }, [schemaType.fields]);

  const onLocaleValue = useCallback(
    (next: string) => {
      const trimmed = next;
      if (!trimmed.trim()) {
        const rest = { ...map };
        delete rest[locale];
        onChange(Object.keys(rest).length ? set(rest) : unset());
        return;
      }
      onChange(set({ ...map, [locale]: trimmed }));
    },
    [locale, map, onChange],
  );

  const current = map[locale] ?? "";
  const filled = LOCALES.filter((code) => Boolean(map[code]?.trim())).length;

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <strong style={{ fontSize: 13 }}>Language</strong>
        <select
          value={locale}
          onChange={(e) => setLocale(e.currentTarget.value as LocaleCode)}
          style={{ maxWidth: "14rem", padding: "0.35rem 0.5rem" }}
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_LABELS[code]}
              {map[code]?.trim() ? "" : " · empty"}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {filled}/{LOCALES.length} filled · empty falls back to English on the
          site
        </span>
      </div>
      {isText ? (
        <textarea
          rows={4}
          value={current}
          onChange={(e) => onLocaleValue(e.currentTarget.value)}
          placeholder={`${LOCALE_LABELS[locale]} copy`}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.65rem 0.75rem",
            border: "1px solid var(--card-border-color, #ccc)",
            borderRadius: 2,
            background: "var(--card-bg-color, #fff)",
            color: "var(--card-fg-color, #111)",
            font: "inherit",
          }}
        />
      ) : (
        <input
          type="text"
          value={current}
          placeholder={`${LOCALE_LABELS[locale]} copy`}
          onChange={(e) => onLocaleValue(e.currentTarget.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.65rem 0.75rem",
            border: "1px solid var(--card-border-color, #ccc)",
            borderRadius: 2,
            background: "var(--card-bg-color, #fff)",
            color: "var(--card-fg-color, #111)",
            font: "inherit",
          }}
        />
      )}
    </div>
  );
}
