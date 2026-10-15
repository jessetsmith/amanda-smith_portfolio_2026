"use client";

import Link from "next/link";
import type { NavItem } from "@/types/content";
import { LanguageDropdown } from "@/components/LanguageDropdown";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface HazyNavProps {
  brand: NavItem["label"] | string;
  items: NavItem[];
}

export function HazyNav({ brand, items }: HazyNavProps) {
  const { t, ui } = useLocale();

  return (
    <header className="hazy-nav">
      <div className="hazy-nav__bar">
        <Link href="/" className="hazy-nav__brand">
          {t(brand)}
        </Link>
        <nav className="hazy-nav__menu" aria-label={ui("primaryNav")}>
          <ul className="hazy-nav__list">
            {items.map((item) => (
              <li key={`${t(item.label)}-${item.href}`}>
                {item.href.startsWith("mailto:") || item.href.startsWith("http") ? (
                  <a href={item.href} className="hazy-nav__link">
                    {t(item.label)}
                  </a>
                ) : (
                  <Link href={item.href} className="hazy-nav__link">
                    {t(item.label)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <LanguageDropdown />
      </div>
    </header>
  );
}
