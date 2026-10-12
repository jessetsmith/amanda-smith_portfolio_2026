"use client";

import { useEffect, useRef } from "react";
import type { GridItem } from "@/types/grid";
import { sortGridItems } from "@/lib/grid";
import { GridCell } from "./GridCell";

interface HomepageGridProps {
  items: GridItem[];
}

export function HomepageGrid({ items }: HomepageGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sorted = sortGridItems(items);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cells = root.querySelectorAll<HTMLElement>(".grid-cell");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      root.classList.add("lines-active");
      cells.forEach((cell) => cell.classList.add("is-inview"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-inview");
          root.classList.add("lines-active");
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.18 },
    );

    cells.forEach((cell) => observer.observe(cell));
    return () => observer.disconnect();
  }, [items]);

  return (
    <section
      ref={rootRef}
      className="homepage-grid mx-auto w-full max-w-[90rem] px-4 pb-24 sm:px-6 md:px-8"
      aria-label="Homepage grid"
    >
      <div className="grid-canvas">
        <div className="grid-lines" aria-hidden />
        <div className="staggered-grid">
          {sorted.map((item) => (
            <GridCell key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
