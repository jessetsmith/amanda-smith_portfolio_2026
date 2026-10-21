"use client";

import Link from "next/link";
import { useCallback, useState, type CSSProperties } from "react";
import { ContactModal } from "@/components/ContactModal";
import { LanguageDropdown } from "@/components/LanguageDropdown";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  isContactNavHref,
  isContactNavLabel,
  mailtoAddress,
} from "@/lib/contact";
import type { NavItem } from "@/types/content";
import type { CellTextSize } from "@/types/grid";

interface HazyNavProps {
  brand: NavItem["label"] | string;
  items: NavItem[];
  textColor?: string;
  textSize?: CellTextSize;
}

export function HazyNav({ brand, items, textColor, textSize }: HazyNavProps) {
  const { t, ui } = useLocale();
  const [contactOpen, setContactOpen] = useState(false);
  const [mailtoEmail, setMailtoEmail] = useState<string | undefined>();
  const closeContact = useCallback(() => setContactOpen(false), []);

  const sizeAttr = textSize && textSize !== "md" ? textSize : undefined;
  const style = textColor
    ? ({ ["--nav-text-color" as string]: textColor } as CSSProperties)
    : undefined;

  function openContact(href: string) {
    setMailtoEmail(mailtoAddress(href));
    setContactOpen(true);
  }

  return (
    <>
      <header className="hazy-nav" style={style} data-text-size={sizeAttr}>
        <div className="hazy-nav__bar">
          <Link href="/" className="hazy-nav__brand">
            {t(brand)}
          </Link>
          <nav className="hazy-nav__menu" aria-label={ui("primaryNav")}>
            <ul className="hazy-nav__list">
              {items.map((item) => {
                const label = t(item.label);
                const isContact =
                  isContactNavHref(item.href) || isContactNavLabel(label);

                if (isContact) {
                  return (
                    <li key={`${label}-${item.href}`}>
                      <button
                        type="button"
                        className="hazy-nav__link hazy-nav__link--button"
                        onClick={() => openContact(item.href)}
                      >
                        {label}
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={`${label}-${item.href}`}>
                    {item.href.startsWith("http") ? (
                      <a
                        href={item.href}
                        className="hazy-nav__link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {label}
                      </a>
                    ) : (
                      <Link href={item.href} className="hazy-nav__link">
                        {label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
          <LanguageDropdown />
        </div>
      </header>

      <ContactModal
        open={contactOpen}
        onClose={closeContact}
        mailtoEmail={mailtoEmail ?? "Amandajsmith@arizona.edu"}
      />
    </>
  );
}
