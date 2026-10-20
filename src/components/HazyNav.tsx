"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { NavItem } from "@/types/content";
import type { CellTextSize } from "@/types/grid";
import { LanguageDropdown } from "@/components/LanguageDropdown";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface HazyNavProps {
  brand: NavItem["label"] | string;
  items: NavItem[];
  textColor?: string;
  textSize?: CellTextSize;
}

export function HazyNav({ brand, items, textColor, textSize }: HazyNavProps) {
  const { t, ui } = useLocale();
  const sizeAttr = textSize && textSize !== "md" ? textSize : undefined;
  const style = (
    textColor
      ? ({ ["--nav-text-color" as string]: textColor } as CSSProperties)
      : undefined
  );

  return (
    <header className="hazy-nav" style={style} data-text-size={sizeAttr}>
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
