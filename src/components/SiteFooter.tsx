import Image from "next/image";

/** Established credit link from portfolio_2024. */
export const NOWHERE_MAPS_URL = "https://portfolio.nowheremaps.net/";

/**
 * Site-wide credit footer — dark charcoal bar, white type,
 * diamond NOWHERE icon between “Site made by” and “NowhereMaps Digital”.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a
        className="site-footer__credit"
        href={NOWHERE_MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="site-footer__text">Site made by</span>
        <Image
          className="site-footer__mark"
          src="/icons/NOWHERE.png"
          alt=""
          width={36}
          height={36}
          unoptimized
        />
        <span className="site-footer__text site-footer__brand">
          NowhereMaps Digital
        </span>
      </a>
    </footer>
  );
}
