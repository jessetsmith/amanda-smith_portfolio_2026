"use client";

import { useEffect, useRef, type PointerEvent } from "react";

interface IntroMaskProps {
  maskText: string;
  support: string;
  videoSrc: string;
  posterSrc?: string;
}

export function IntroMask({
  maskText,
  support,
  videoSrc,
  posterSrc,
}: IntroMaskProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      section.style.setProperty("--intro-progress", "1");
      return;
    }

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const total = Math.max(rect.height - window.innerHeight, 1);
      const raw = Math.min(1, Math.max(0, -rect.top / total));
      section.style.setProperty("--intro-progress", String(raw));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const setSpotlight = (xPx: number, yPx: number, spot: string) => {
    const region = titleRegionRef.current;
    if (!region) return;
    region.style.setProperty("--haze-x", `${xPx}px`);
    region.style.setProperty("--haze-y", `${yPx}px`);
    region.style.setProperty("--haze-spot", spot);
  };

  const clearSpotlight = () => {
    setSpotlight(0, 0, "0px");
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const haze = titleRegionRef.current?.querySelector<HTMLElement>(
      ".intro-mask__title-haze",
    );
    if (!haze) return;
    const rect = haze.getBoundingClientRect();
    setSpotlight(
      event.clientX - rect.left,
      event.clientY - rect.top,
      "7.5rem",
    );
  };

  const onFocus = () => {
    const haze = titleRegionRef.current?.querySelector<HTMLElement>(
      ".intro-mask__title-haze",
    );
    if (!haze) return;
    setSpotlight(haze.clientWidth / 2, haze.clientHeight / 2, "7.5rem");
  };

  return (
    <section ref={sectionRef} className="intro-mask" aria-label="Introduction">
      <div className="intro-mask__sticky">
        {/* Alternate under-layer revealed through the text punch */}
        <div className="intro-mask__under" aria-hidden>
          <div className="intro-mask__under-wash" />
          <p className="intro-mask__under-copy">
            Research · exhibitions · writing
          </p>
        </div>

        {/* Isolated stack: destination-out title cuts video → under-layer */}
        <div className="intro-mask__punch">
          <video
            className="intro-mask__video"
            autoPlay
            muted
            loop
            playsInline
            poster={posterSrc}
            src={videoSrc}
          />
          <h1 className="intro-mask__title" aria-hidden>
            {maskText}
          </h1>
        </div>

        <div className="intro-mask__content">
          <div
            ref={titleRegionRef}
            className="intro-mask__title-region"
            tabIndex={0}
            aria-label={maskText}
            onPointerMove={onPointerMove}
            onPointerLeave={clearSpotlight}
            onBlur={clearSpotlight}
            onFocus={onFocus}
          >
            <span className="intro-mask__title-haze" aria-hidden />
            <p className="intro-mask__title-fill" aria-hidden>
              {maskText}
            </p>
            <p className="intro-mask__title-readable" aria-hidden>
              {maskText}
            </p>
          </div>
          <p className="intro-mask__support">{support}</p>
        </div>
      </div>
    </section>
  );
}
