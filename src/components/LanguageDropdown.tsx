"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT,
  type LocaleCode,
} from "@/lib/i18n/locales";

export function LanguageDropdown() {
  const { locale, setLocale, ui } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(code: LocaleCode) {
    setLocale(code);
    setOpen(false);
  }

  return (
    <div className="lang-dropdown" ref={rootRef}>
      <button
        type="button"
        className="lang-dropdown__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ui("language")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lang-dropdown__code">{LOCALE_SHORT[locale]}</span>
        <span className="lang-dropdown__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="lang-dropdown__menu"
          role="listbox"
          aria-label={ui("language")}
        >
          {LOCALES.map((code) => (
            <li key={code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={code === locale}
                className={`lang-dropdown__option${
                  code === locale ? " is-active" : ""
                }`}
                onClick={() => select(code)}
              >
                <span className="lang-dropdown__option-code">
                  {LOCALE_SHORT[code]}
                </span>
                <span className="lang-dropdown__option-label">
                  {LOCALE_LABELS[code]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
