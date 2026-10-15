"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  parseLocale,
  type LocaleCode,
} from "@/lib/i18n/locales";
import type { LocaleString } from "@/lib/i18n/resolve";
import { resolveLocale } from "@/lib/i18n/resolve";
import {
  mergeUiCopyDoc,
  resolveUiCopy,
  type UiCopyDoc,
  type UiCopyKey,
} from "@/lib/i18n/ui-copy";

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (value: LocaleString | null | undefined) => string;
  ui: (key: UiCopyKey) => string;
  uiCopy: UiCopyDoc;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  uiCopy: uiCopyProp,
}: {
  children: ReactNode;
  uiCopy?: UiCopyDoc | null;
}) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);
  const uiCopy = useMemo(() => mergeUiCopyDoc(uiCopyProp), [uiCopyProp]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      setLocaleState(parseLocale(stored));
    } catch {
      setLocaleState(DEFAULT_LOCALE);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore quota / private mode */
    }
  }, [locale, hydrated]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (value: LocaleString | null | undefined) => resolveLocale(value, locale),
    [locale],
  );

  const ui = useCallback(
    (key: UiCopyKey) => resolveUiCopy(key, locale, uiCopy),
    [locale, uiCopy],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ui, uiCopy }),
    [locale, setLocale, t, ui, uiCopy],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Safe outside provider (admin Studio shells) — always English. */
export function useLocaleOptional(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => undefined,
    t: (value) => resolveLocale(value, DEFAULT_LOCALE),
    ui: (key) => resolveUiCopy(key, DEFAULT_LOCALE),
    uiCopy: mergeUiCopyDoc(null),
  };
}
