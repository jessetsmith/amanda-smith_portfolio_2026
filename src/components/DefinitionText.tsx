"use client";

import { useMemo, useState } from "react";
import definitions from "@/data/definitions.json";

interface DefinitionEntry {
  phrase: string;
  definition: string;
}

interface DefinitionTextProps {
  text: string;
  className?: string;
}

export function DefinitionText({ text, className }: DefinitionTextProps) {
  const entries = definitions as DefinitionEntry[];
  const parts = useMemo(() => annotateText(text, entries), [text, entries]);

  return (
    <p className={className}>
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

  return (
    <span
      className="definition-phrase"
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span className="definition-phrase__text">{phrase}</span>
      <span
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
