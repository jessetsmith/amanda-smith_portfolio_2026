"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import definitions from "@/data/definitions.json";

interface DefinitionEntry {
  phrase: string;
  definition: string;
}

interface DefinitionTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  "data-text-size"?: string;
}

export function DefinitionText({
  text,
  className,
  style,
  "data-text-size": dataTextSize,
}: DefinitionTextProps) {
  const entries = definitions as DefinitionEntry[];
  const parts = useMemo(() => annotateText(text, entries), [text, entries]);

  return (
    <p className={className} style={style} data-text-size={dataTextSize}>
      {parts.map((part, index) =>
        part.definition ? (
          <DefinitionPhrase
            key={`${part.text}-${index}`}
            phrase={part.text}
            definition={part.definition}
          />
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </p>
  );
}

function DefinitionPhrase({
  phrase,
  definition,
}: {
  phrase: string;
  definition: string;
}) {
  const [open, setOpen] = useState(false);
  const tipRef = useRef<HTMLSpanElement>(null);

  const keepTipInView = () => {
    const tip = tipRef.current;
    if (!tip) return;
    tip.style.transform = "translateY(0)";
    // Measure after open class applies, then clamp horizontally
    requestAnimationFrame(() => {
      const rect = tip.getBoundingClientRect();
      const pad = 8;
      let shift = 0;
      if (rect.right > window.innerWidth - pad) {
        shift = window.innerWidth - pad - rect.right;
      }
      if (rect.left + shift < pad) {
        shift = pad - rect.left;
      }
      tip.style.transform =
        shift !== 0 ? `translateY(0) translateX(${shift}px)` : "translateY(0)";
    });
  };

  const show = () => {
    setOpen(true);
    keepTipInView();
  };

  const hide = () => {
    setOpen(false);
    tipRef.current?.style.removeProperty("transform");
  };

  return (
    <span
      className="definition-phrase"
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={() => (open ? hide() : show())}
    >
      <span className="definition-phrase__text">{phrase}</span>
      <span
        ref={tipRef}
        className={`definition-phrase__tip ${open ? "is-open" : ""}`}
        role="tooltip"
      >
        <span className="font-mono text-[0.6rem] tracking-[0.16em] uppercase opacity-70">
          Definition
        </span>
        <span className="mt-1 block text-sm leading-snug">{definition}</span>
      </span>
    </span>
  );
}

function annotateText(text: string, entries: DefinitionEntry[]) {
  const sorted = [...entries].sort((a, b) => b.phrase.length - a.phrase.length);
  const parts: { text: string; definition?: string }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest = -1;
    let match: DefinitionEntry | null = null;

    for (const entry of sorted) {
      const idx = remaining.toLowerCase().indexOf(entry.phrase.toLowerCase());
      if (idx >= 0 && (earliest < 0 || idx < earliest)) {
        earliest = idx;
        match = entry;
      }
    }

    if (!match || earliest < 0) {
      parts.push({ text: remaining });
      break;
    }

    if (earliest > 0) {
      parts.push({ text: remaining.slice(0, earliest) });
    }
    const end = earliest + match.phrase.length;
    parts.push({
      text: remaining.slice(earliest, end),
      definition: match.definition,
    });
    remaining = remaining.slice(end);
  }

  return parts;
}
