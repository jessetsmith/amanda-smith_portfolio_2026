"use client";

import Link from "next/link";
import type { NavItem } from "@/types/content";
import { LanguageToggle } from "@/components/LanguageToggle";

interface HazyNavProps {
  brand: string;
  items: NavItem[];
}

export function HazyNav({ brand, items }: HazyNavProps) {
  return (
    <header className="hazy-nav">
      <div className="hazy-nav__bar">
        <Link href="/" className="hazy-nav__brand">
          {brand}
        </Link>
        <nav className="hazy-nav__menu" aria-label="Primary">
          <ul className="hazy-nav__list">
            {items.map((item) => (
              <li key={`${item.label}-${item.href}`}>
                {item.href.startsWith("mailto:") || item.href.startsWith("http") ? (
                  <a href={item.href} className="hazy-nav__link">
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className="hazy-nav__link">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <LanguageToggle />
      </div>
    </header>
  );
}
