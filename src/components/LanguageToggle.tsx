"use client";

import { useState } from "react";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "it", label: "IT" },
];

export function LanguageToggle() {
  const [lang, setLang] = useState("en");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSelect(code: string) {
    setLang(code);
    if (code === "en") {
      setStatus(null);
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: code,
          text: "Exhibitions, research, and writing.",
        }),
      });
      const data = (await res.json()) as {
        stub?: boolean;
        message?: string;
        translatedText?: string;
      };
      setStatus(
        data.stub
          ? data.message || "Translate stub — add API key later"
          : data.translatedText || "Translated",
      );
    } catch {
      setStatus("Translate unavailable");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="lang-toggle">
      <div className="lang-toggle__row" role="group" aria-label="Language">
        {LANGS.map((item) => (
          <button
            key={item.code}
            type="button"
            className={`lang-toggle__btn ${lang === item.code ? "is-active" : ""}`}
            onClick={() => void onSelect(item.code)}
            disabled={pending}
          >
            {item.label}
          </button>
        ))}
      </div>
      {status ? (
        <p className="lang-toggle__status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
