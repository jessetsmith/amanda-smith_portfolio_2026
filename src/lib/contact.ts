/** Formspree endpoint for the public contact modal. */
export const FORMSPREE_ENDPOINT = "https://formspree.io/f/mpwavolz";

export function isContactNavHref(href: string): boolean {
  const value = href.trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith("mailto:")) return true;
  if (value === "#contact" || value === "/contact" || value.endsWith("/contact")) {
    return true;
  }
  return false;
}

export function isContactNavLabel(label: string): boolean {
  return /^contact$/i.test(label.trim());
}

export function mailtoAddress(href: string): string | undefined {
  if (!href.toLowerCase().startsWith("mailto:")) return undefined;
  const raw = href.slice("mailto:".length).split("?")[0]?.trim();
  return raw || undefined;
}
