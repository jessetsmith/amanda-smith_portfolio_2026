"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useLocaleOptional } from "@/components/i18n/LocaleProvider";
import { DEFAULT_STAMP_HINT, resolveStampHint } from "@/lib/hero";
import { resolveHeroMedia, resolveHeroPoster } from "@/lib/hero-media";
import type { LocaleString } from "@/lib/i18n/resolve";

interface IntroMaskProps {
  maskText: LocaleString;
  support: LocaleString;
  videoSrc: string;
  posterSrc?: string;
  /** Used when videoSrc is empty (still cover). */
  imageSrc?: string;
  /** Optional “watch full video” link (new tab). */
  watchUrl?: string;
  /**
   * First-hover tip before stamping. Empty → default “click to leave your mark”.
   * Only shown when enableHandCursor is on (public).
   */
  stampHint?: LocaleString;
  /**
   * Handprint overlay + `cursor: none` on the cover.
   * Public homepage only — leave off in admin live preview.
   */
  enableHandCursor?: boolean;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YtPlayer }) => void;
            onStateChange?: (event: { data: number; target: YtPlayer }) => void;
            onError?: (event: { data: number; target: YtPlayer }) => void;
          };
        },
      ) => YtPlayer;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayer {
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  playVideo: () => void;
  destroy: () => void;
  setVolume: (n: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  loadVideoById: (
    opts: { videoId: string; startSeconds?: number } | string,
    startSeconds?: number,
  ) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    // API may already be mid-load
    const poll = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(poll);
        resolve();
      }
    }, 50);
  });

  return youtubeApiPromise;
}

/** Session-only hero stamps (public). print-3.png was blank — skipped. */
const HANDPRINT_SRCS = [
  "/handprints/print-1.png",
  "/handprints/print-2.png",
] as const;

const HANDPRINT_TINTS = [
  "#1a1512",
  "#2c241c",
  "#5c4033",
  "#8b3a2a",
  "#a65d3f",
  "#6b4f3a",
  "#3d4a3c",
  "#4a5560",
] as const;

type HeroHandprint = {
  id: string;
  src: string;
  x: number;
  y: number;
  angle: number;
  scale: number;
  mirror: boolean;
  tint: string;
  opacity: number;
};

function randomHandprint(
  xPct: number,
  yPct: number,
): HeroHandprint {
  const jitter = () => (Math.random() - 0.5) * 4;
  return {
    id: `hp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    src: HANDPRINT_SRCS[Math.floor(Math.random() * HANDPRINT_SRCS.length)]!,
    x: Math.min(96, Math.max(4, xPct + jitter())),
    y: Math.min(96, Math.max(4, yPct + jitter())),
    angle: -38 + Math.random() * 76,
    scale: 0.72 + Math.random() * 0.55,
    mirror: Math.random() < 0.5,
    tint: HANDPRINT_TINTS[Math.floor(Math.random() * HANDPRINT_TINTS.length)]!,
    opacity: 0.55 + Math.random() * 0.35,
  };
}

export function IntroMask({
  maskText,
  support,
  videoSrc,
  posterSrc,
  imageSrc,
  watchUrl,
  stampHint,
  enableHandCursor = true,
}: IntroMaskProps) {
  const { t, ui, locale } = useLocaleOptional();
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const handCursorRef = useRef<HTMLDivElement>(null);
  const hazeRef = useRef<HTMLSpanElement>(null);
  const titleRegionRef = useRef<HTMLDivElement>(null);
  const media = resolveHeroMedia(videoSrc);
  const hasPlayable = media.kind === "video" || media.kind === "youtube";
  const coverPoster = resolveHeroPoster(
    posterSrc,
    imageSrc,
    media.youtubeId,
  );
  const watchHref = watchUrl?.trim() || "";
  const title = t(maskText);
  const supportLine = t(support);
  const stampHintText =
    resolveStampHint({ stampHint }, locale) || DEFAULT_STAMP_HINT;
  const [soundOn, setSoundOn] = useState(false);
  const [handCursorMounted, setHandCursorMounted] = useState(false);
  /** Public-only session stamps — cleared on refresh (no persistence). */
  const [handprints, setHandprints] = useState<HeroHandprint[]>([]);
  /**
   * Tip: mount → fade in on pointer-inside; fade out on first stamp, then unmount.
   * Session-only (refresh can show again).
   */
  const [stampHintMounted, setStampHintMounted] = useState(false);
  const [stampHintVisible, setStampHintVisible] = useState(false);
  const [stampHintDismissed, setStampHintDismissed] = useState(false);
  const stampHintFadeRef = useRef<number | null>(null);
  const lastStampAtRef = useRef(0);
  const soundApiRef = useRef<{ setMuted: (muted: boolean) => void } | null>(
    null,
  );

  // Warm cursor + stamp assets (public only)
  useEffect(() => {
    if (!enableHandCursor) {
      setHandCursorMounted(false);
      setHandprints([]);
      return;
    }
    const img = new window.Image();
    img.src = "/cursors/handprint.png";
    for (const src of HANDPRINT_SRCS) {
      const stamp = new window.Image();
      stamp.src = src;
    }
    setHandCursorMounted(true);
  }, [enableHandCursor]);

  // Stable handprint: system cursor locked to none; one overlay follows the
  // pointer. Document capture listeners avoid leave/enter flicker across
  // title/haze/shield/iframe stacking. Skipped in admin live preview.
  useEffect(() => {
    if (!enableHandCursor || !handCursorMounted) return;
    const sticky = stickyRef.current;
    const hand = handCursorRef.current;
    if (!sticky || !hand) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;

    const root = document.documentElement;
    const HOTSPOT_X = 11;
    const HOTSPOT_Y = 3;

    let x = 0;
    let y = 0;
    let raf = 0;
    /** off | hand | control */
    let mode: "off" | "hand" | "control" = "off";

    const paint = () => {
      raf = 0;
      if (mode !== "hand") return;
      hand.style.transform = `translate3d(${x - HOTSPOT_X}px, ${y - HOTSPOT_Y}px, 0)`;
    };

    const schedulePaint = () => {
      if (!raf) raf = window.requestAnimationFrame(paint);
    };

    const setMode = (next: "off" | "hand" | "control") => {
      if (mode === next) return;
      mode = next;

      if (next === "hand") {
        root.classList.add("intro-mask--hand-cursor");
        root.classList.remove("intro-mask--control-cursor");
        sticky.classList.remove("is-control-cursor");
        hand.classList.add("is-on");
        schedulePaint();
        return;
      }

      hand.classList.remove("is-on");
      hand.style.transform = "translate3d(-9999px, -9999px, 0)";
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }

      if (next === "control") {
        root.classList.add("intro-mask--hand-cursor");
        root.classList.add("intro-mask--control-cursor");
        sticky.classList.add("is-control-cursor");
        return;
      }

      root.classList.remove("intro-mask--hand-cursor");
      root.classList.remove("intro-mask--control-cursor");
      sticky.classList.remove("is-control-cursor");
    };

    const hitInsideSticky = (clientX: number, clientY: number) => {
      const rect = sticky.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX < rect.right &&
        clientY >= rect.top &&
        clientY < rect.bottom
      );
    };

    const pointInRect = (
      clientX: number,
      clientY: number,
      rect: DOMRect,
    ) =>
      clientX >= rect.left &&
      clientX < rect.right &&
      clientY >= rect.top &&
      clientY < rect.bottom;

    const overControlAt = (
      clientX: number,
      clientY: number,
      target: EventTarget | null,
    ) => {
      if (
        target instanceof Element &&
        target.closest(".intro-mask__sound, .intro-mask__watch")
      ) {
        return true;
      }
      // Bounds check — reliable when stacking / elementFromPoint is flaky.
      const controls = sticky.querySelectorAll(
        ".intro-mask__sound, .intro-mask__watch",
      );
      for (const el of controls) {
        if (pointInRect(clientX, clientY, el.getBoundingClientRect())) {
          return true;
        }
      }
      return false;
    };

    const onPointerMove = (event: Event) => {
      const e = event as globalThis.PointerEvent;
      if (e.pointerType === "touch" || e.pointerType === "pen") return;

      const { clientX, clientY } = e;
      if (!hitInsideSticky(clientX, clientY)) {
        setMode("off");
        return;
      }

      if (overControlAt(clientX, clientY, e.target)) {
        setMode("control");
        return;
      }

      x = clientX;
      y = clientY;
      if (mode !== "hand") setMode("hand");
      else schedulePaint();
    };

    const onBlur = () => setMode("off");

    // Capture on document so stacking/iframe quirks can't drop moves mid-cover.
    document.addEventListener("pointermove", onPointerMove, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerdown", onPointerMove, {
      capture: true,
      passive: true,
    });
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerdown", onPointerMove, true);
      window.removeEventListener("blur", onBlur);
      setMode("off");
      root.classList.remove("intro-mask--hand-cursor");
      root.classList.remove("intro-mask--control-cursor");
      sticky.classList.remove("is-control-cursor");
      hand.classList.remove("is-on");
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [enableHandCursor, handCursorMounted]);

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

  // Reset sound when media source changes (always start muted for autoplay)
  useEffect(() => {
    setSoundOn(false);
    soundApiRef.current?.setMuted(true);
  }, [media.kind, media.videoUrl, media.youtubeId]);

  const isCoarsePointer = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none), (pointer: coarse)").matches;

  const setSpotlight = (xPx: number, yPx: number, spot: string) => {
    const haze = hazeRef.current;
    if (!haze) return;
    haze.style.setProperty("--haze-x", `${xPx}px`);
    haze.style.setProperty("--haze-y", `${yPx}px`);
    haze.style.setProperty("--haze-spot", spot);
  };

  const clearSpotlight = () => {
    if (isCoarsePointer()) return;
    setSpotlight(0, 0, "0px");
  };

  // Touch: soft static clear-spot (no cursor spotlight / hand cursor)
  useEffect(() => {
    const haze = hazeRef.current;
    if (!haze) return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => {
      if (!mq.matches) return;
      haze.style.setProperty("--haze-x", "50%");
      haze.style.setProperty("--haze-y", "42%");
      haze.style.setProperty("--haze-spot", "8rem");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (isCoarsePointer()) return;
    const haze = hazeRef.current;
    if (!haze) return;
    const rect = haze.getBoundingClientRect();
    setSpotlight(
      event.clientX - rect.left,
      event.clientY - rect.top,
      // Compact soft reveal — enough room for the feather, not a huge clear field
      "6rem",
    );
  };

  const onFocus = () => {
    const haze = hazeRef.current;
    if (!haze) return;
    setSpotlight(haze.clientWidth / 2, haze.clientHeight / 2, "6rem");
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundApiRef.current?.setMuted(!next);
  };

  const revealStampHint = useCallback(() => {
    if (!enableHandCursor || stampHintDismissed) return;
    if (stampHintFadeRef.current) {
      window.clearTimeout(stampHintFadeRef.current);
      stampHintFadeRef.current = null;
    }
    setStampHintMounted(true);
    // Next frame so opacity transition runs from 0 → 1
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setStampHintVisible(true));
    });
  }, [enableHandCursor, stampHintDismissed]);

  const dismissStampHint = useCallback(() => {
    if (stampHintDismissed) return;
    setStampHintDismissed(true);
    setStampHintVisible(false);
    if (stampHintFadeRef.current) {
      window.clearTimeout(stampHintFadeRef.current);
    }
    stampHintFadeRef.current = window.setTimeout(() => {
      setStampHintMounted(false);
      stampHintFadeRef.current = null;
    }, 600);
  }, [stampHintDismissed]);

  // If the pointer is already over the hero on load (or moves inside), show tip.
  useEffect(() => {
    if (!enableHandCursor || stampHintDismissed) return;
    const sticky = stickyRef.current;
    if (!sticky) return;

    const pointerInsideSticky = (clientX?: number, clientY?: number) => {
      try {
        if (sticky.matches(":hover")) return true;
      } catch {
        /* :hover may throw in odd environments */
      }
      if (
        typeof clientX === "number" &&
        typeof clientY === "number" &&
        Number.isFinite(clientX) &&
        Number.isFinite(clientY)
      ) {
        const hit = document.elementFromPoint(clientX, clientY);
        if (hit && sticky.contains(hit)) return true;
      }
      return false;
    };

    const maybeReveal = (clientX?: number, clientY?: number) => {
      if (pointerInsideSticky(clientX, clientY)) revealStampHint();
    };

    // After paint — catches mouse already resting on the cover
    const raf = requestAnimationFrame(() => maybeReveal());

    const onPointerMove = (event: Event) => {
      const e = event as globalThis.PointerEvent;
      maybeReveal(e.clientX, e.clientY);
    };

    sticky.addEventListener("pointerenter", onPointerMove, { passive: true });
    sticky.addEventListener("pointermove", onPointerMove, { passive: true });
    // First document move covers the “already over hero” case when :hover is flaky
    document.addEventListener("pointermove", onPointerMove, {
      passive: true,
      capture: true,
    });

    return () => {
      cancelAnimationFrame(raf);
      sticky.removeEventListener("pointerenter", onPointerMove);
      sticky.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointermove", onPointerMove, true);
    };
  }, [enableHandCursor, stampHintDismissed, revealStampHint]);

  useEffect(() => {
    return () => {
      if (stampHintFadeRef.current) {
        window.clearTimeout(stampHintFadeRef.current);
      }
    };
  }, []);

  const stampHandprint = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enableHandCursor) return;
      if (event.button !== 0) return;
      const target = event.target as Element | null;
      if (
        target?.closest?.(
          ".intro-mask__media-controls, .intro-mask__sound, .intro-mask__watch, a, button",
        )
      ) {
        return;
      }
      const sticky = stickyRef.current;
      if (!sticky) return;
      const now = Date.now();
      // Intentional stamps — avoid accidental spray while dragging
      if (now - lastStampAtRef.current < 280) return;
      lastStampAtRef.current = now;

      const rect = sticky.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const xPct = ((event.clientX - rect.left) / rect.width) * 100;
      const yPct = ((event.clientY - rect.top) / rect.height) * 100;
      dismissStampHint();
      setHandprints((prev) => {
        const next = [...prev, randomHandprint(xPct, yPct)];
        // Soft cap so a long session doesn’t pile infinitely
        return next.length > 36 ? next.slice(next.length - 36) : next;
      });
    },
    [enableHandCursor, dismissStampHint],
  );

  return (
    <section ref={sectionRef} className="intro-mask" aria-label="Introduction">
      {enableHandCursor && handCursorMounted
        ? createPortal(
            <div
              ref={handCursorRef}
              className="intro-mask__hand-cursor"
              aria-hidden
            />,
            document.body,
          )
        : null}
      <div
        ref={stickyRef}
        className="intro-mask__sticky"
        onPointerUp={enableHandCursor ? stampHandprint : undefined}
      >
        {enableHandCursor && stampHintMounted ? (
          <p
            className={`intro-mask__stamp-hint${
              stampHintVisible ? " is-visible" : ""
            }`}
            role="status"
            aria-hidden={stampHintDismissed || !stampHintVisible}
          >
            {stampHintText}
          </p>
        ) : null}
        {/* Alternate under-layer revealed through the text punch */}
        <div className="intro-mask__under" aria-hidden>
          <div className="intro-mask__under-wash" />
          <p className="intro-mask__under-copy">
            Research · exhibitions · writing
          </p>
        </div>

        {/* Video/image + cloud haze + destination-out solid name (one solid layer) */}
        <div className="intro-mask__punch">
          {media.kind === "video" && media.videoUrl ? (
            <>
              <NativeHeroVideo
                src={media.videoUrl}
                poster={coverPoster}
                soundOn={soundOn}
                registerApi={(api) => {
                  soundApiRef.current = api;
                }}
              />
              <div className="intro-mask__video-shield" aria-hidden />
            </>
          ) : media.kind === "youtube" && media.youtubeId ? (
            <YouTubeHeroVideo
              videoId={media.youtubeId}
              poster={coverPoster}
              soundOn={soundOn}
              registerApi={(api) => {
                soundApiRef.current = api;
              }}
            />
          ) : coverPoster || imageSrc || posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="intro-mask__video"
              src={coverPoster || imageSrc || posterSrc}
              alt=""
            />
          ) : null}
          {/* Session stamps: above video, under haze. Public only. */}
          {enableHandCursor && handprints.length > 0 ? (
            <div className="intro-mask__handprints" aria-hidden>
              {handprints.map((print) => (
                <span
                  key={print.id}
                  className="intro-mask__handprint"
                  style={{
                    left: `${print.x}%`,
                    top: `${print.y}%`,
                    opacity: print.opacity,
                    backgroundColor: print.tint,
                    ["--hp-src" as string]: `url(${print.src})`,
                    transform: `translate(-50%, -50%) rotate(${print.angle}deg) scaleX(${print.mirror ? -1 : 1}) scale(${print.scale})`,
                  }}
                />
              ))}
            </div>
          ) : null}
          <span
            ref={hazeRef}
            className="intro-mask__title-haze"
            aria-hidden
            onPointerMove={onPointerMove}
            onPointerLeave={clearSpotlight}
          >
            <span className="intro-mask__haze-cloud intro-mask__haze-cloud--a" />
            <span className="intro-mask__haze-cloud intro-mask__haze-cloud--b" />
            <span className="intro-mask__haze-cloud intro-mask__haze-cloud--c" />
            <span className="intro-mask__haze-cloud intro-mask__haze-cloud--d" />
            <span className="intro-mask__haze-cloud intro-mask__haze-cloud--e" />
          </span>
          <h1 className="intro-mask__title" aria-hidden>
            {title}
          </h1>
        </div>

        <div className="intro-mask__content">
          {/* Outline-only twin (transparent fill + white stroke), stacked/offset */}
          <div
            ref={titleRegionRef}
            className="intro-mask__title-region"
            tabIndex={0}
            aria-label={title}
            onPointerMove={onPointerMove}
            onPointerLeave={clearSpotlight}
            onBlur={clearSpotlight}
            onFocus={onFocus}
          >
            <p className="intro-mask__title-readable" aria-hidden>
              {title}
            </p>
          </div>
          <p className="intro-mask__support">{supportLine}</p>
        </div>

        {hasPlayable || watchHref ? (
          <div className="intro-mask__media-controls">
            {watchHref ? (
              <a
                className="intro-mask__watch"
                href={watchHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ui("watchFullVideo")}
                <span className="intro-mask__watch-arrow" aria-hidden>
                  ↗
                </span>
              </a>
            ) : null}
            {hasPlayable ? (
              <button
                type="button"
                className="intro-mask__sound"
                onClick={toggleSound}
                aria-pressed={soundOn}
                aria-label={soundOn ? ui("muteCover") : ui("unmuteCover")}
                title={soundOn ? ui("soundOn") : ui("soundOff")}
              >
                <SoundIcon on={soundOn} />
                <span>{soundOn ? ui("soundOn") : ui("soundOff")}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg
      className="intro-mask__sound-icon"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3.5 9.5h3.2L11 6.2v11.6L6.7 14.5H3.5V9.5z"
      />
      {on ? (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M14.2 9.2c1.1.9 1.8 2.2 1.8 3.8s-.7 2.9-1.8 3.8M16.8 7c1.8 1.5 2.9 3.7 2.9 6s-1.1 4.5-2.9 6"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M15.2 9.2 20 14M20 9.2l-4.8 4.8"
        />
      )}
    </svg>
  );
}

function NativeHeroVideo({
  src,
  poster,
  soundOn,
  registerApi,
}: {
  src: string;
  poster?: string;
  soundOn: boolean;
  registerApi: (api: { setMuted: (muted: boolean) => void }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const failedRef = useRef(false);
  /** Show CMS/still until the first stable play; lock on error. */
  const [showPoster, setShowPoster] = useState(Boolean(poster));

  useEffect(() => {
    failedRef.current = false;
    setShowPoster(Boolean(poster));
  }, [src, poster]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Hard-strip any chrome the UA might try to surface at loop/pause
    const stripChrome = () => {
      el.controls = false;
      el.removeAttribute("controls");
    };
    stripChrome();

    let restarting = false;
    const restartSeamless = () => {
      if (restarting || failedRef.current) return;
      restarting = true;
      stripChrome();
      try {
        el.currentTime = 0.001;
      } catch {
        // ignore
      }
      void el.play().catch(() => undefined);
      window.setTimeout(() => {
        restarting = false;
      }, 250);
    };

    const markPlaying = () => {
      if (failedRef.current) return;
      stripChrome();
      setShowPoster(false);
    };
    const markFailed = () => {
      failedRef.current = true;
      if (poster) setShowPoster(true);
    };

    // Restart slightly before natural end so the ended/controls seam never paints
    const onTimeUpdate = () => {
      const duration = el.duration;
      if (!Number.isFinite(duration) || duration <= 0.5) return;
      if (duration - el.currentTime <= 0.12) {
        restartSeamless();
      }
    };
    const onEnded = () => restartSeamless();
    const onPause = () => {
      stripChrome();
      if (failedRef.current) return;
      // Cover should always be playing; resume unless the tab is hidden
      if (document.visibilityState === "hidden") return;
      void el.play().catch(() => undefined);
    };
    const onWaiting = () => {
      // Brief buffers: keep video if we already revealed; show poster only pre-first-play
      if (failedRef.current) return;
    };
    const onError = () => markFailed();

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    el.addEventListener("pause", onPause);
    el.addEventListener("play", stripChrome);
    el.addEventListener("playing", markPlaying);
    el.addEventListener("loadeddata", stripChrome);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("error", onError);

    registerApi({
      setMuted: (muted) => {
        el.muted = muted;
        if (!muted) {
          el.volume = 1;
          void el.play().catch(() => undefined);
        }
      },
    });

    void el.play().catch(() => {
      // Autoplay may be blocked — wait for error/timeout before locking poster
    });

    const failTimer = window.setTimeout(() => {
      if (failedRef.current) return;
      if (el.paused && el.readyState < 2) markFailed();
    }, 12000);

    return () => {
      window.clearTimeout(failTimer);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("play", stripChrome);
      el.removeEventListener("playing", markPlaying);
      el.removeEventListener("loadeddata", stripChrome);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("error", onError);
      registerApi({ setMuted: () => undefined });
    };
  }, [poster, registerApi, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || failedRef.current) return;
    el.muted = !soundOn;
    if (!soundOn) return;
    el.volume = 1;
    void el.play().catch(() => undefined);
  }, [soundOn]);

  return (
    <div className="intro-mask__media">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="intro-mask__media-poster"
          data-visible={showPoster ? "1" : "0"}
          src={poster}
          alt=""
          draggable={false}
        />
      ) : null}
      <video
        ref={videoRef}
        className="intro-mask__video"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        tabIndex={-1}
        poster={poster}
        src={src}
      />
    </div>
  );
}

function YouTubeHeroVideo({
  videoId,
  poster,
  soundOn,
  registerApi,
}: {
  videoId: string;
  /** CMS still (or yt thumb fallback) shown while loading / on failure / at loop seams */
  poster?: string;
  soundOn: boolean;
  registerApi: (api: { setMuted: (muted: boolean) => void }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const reactId = useId().replace(/:/g, "");
  const mountId = `yt-hero-${reactId}`;
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  /** Suppress brief PAUSED→resume races right after our own seamless seek. */
  const restartingRef = useRef(false);
  const failedRef = useRef(false);
  const firstPlayDoneRef = useRef(false);
  const unveilPaintTimerRef = useRef<number | null>(null);
  const posterUrl =
    poster || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const setVeil = useCallback((on: boolean, softReveal = false) => {
    if (failedRef.current && !on) return; // never uncover after hard failure
    const veil = veilRef.current;
    const root = rootRef.current;
    if (unveilPaintTimerRef.current != null) {
      window.clearTimeout(unveilPaintTimerRef.current);
      unveilPaintTimerRef.current = null;
    }
    if (on) {
      // Cover first, then hide iframe (both instant — no chrome peek)
      if (veil) {
        veil.dataset.on = "1";
        veil.dataset.soft = "0";
      }
      if (root) root.dataset.veiled = "1";
      return;
    }
    // Unveil: show iframe UNDER the poster, then drop the poster
    if (root) root.dataset.veiled = "0";
    if (veil) veil.dataset.soft = softReveal ? "1" : "0";
    unveilPaintTimerRef.current = window.setTimeout(
      () => {
        if (failedRef.current) return;
        if (veilRef.current) veilRef.current.dataset.on = "0";
        unveilPaintTimerRef.current = null;
      },
      softReveal ? 80 : 1100,
    );
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    const player = playerRef.current;
    if (!player || failedRef.current) return;
    if (muted) player.mute();
    else {
      player.unMute();
      player.setVolume(100);
      player.playVideo();
    }
  }, []);

  useEffect(() => {
    registerApi({ setMuted });
  }, [registerApi, setMuted]);

  useEffect(() => {
    let cancelled = false;
    let loopTimer: number | null = null;
    let unveilTimer: number | null = null;
    let failTimer: number | null = null;
    const host = hostRef.current;
    if (!host) return;

    failedRef.current = false;
    firstPlayDoneRef.current = false;
    host.innerHTML = "";
    const mount = document.createElement("div");
    mount.id = mountId;
    host.appendChild(mount);

    // CMS/still poster until first stable PLAYING frame
    setVeil(true);

    const markFailed = () => {
      failedRef.current = true;
      setVeil(true);
      if (loopTimer != null) {
        window.clearInterval(loopTimer);
        loopTimer = null;
      }
    };

    const restartLoop = (player: YtPlayer) => {
      if (restartingRef.current || failedRef.current) return;
      restartingRef.current = true;
      // Veil BEFORE restart so pause/spinner/end-screen never paints a frame
      setVeil(true);
      try {
        // loadVideoById clears end-screen chrome more reliably than seekTo(0)
        player.loadVideoById({ videoId, startSeconds: 0.01 });
        player.mute();
        if (soundOnRef.current) {
          player.unMute();
          player.setVolume(100);
        }
        player.playVideo();
      } catch {
        try {
          player.seekTo(0.01, true);
          player.playVideo();
        } catch {
          // ignore
        }
      }
    };

    void loadYouTubeApi()
      .then(() => {
        if (cancelled) return;
        if (!window.YT?.Player) {
          markFailed();
          return;
        }
        playerRef.current = new window.YT.Player(mountId, {
          videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            // Manual seamless loop (seek before end) — playlist loop still flashes chrome
            loop: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            showinfo: 0,
            autohide: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled || failedRef.current) return;
              event.target.mute();
              event.target.playVideo();
              if (soundOnRef.current) {
                event.target.unMute();
                event.target.setVolume(100);
              }
              if (process.env.NODE_ENV === "development") {
                (
                  window as Window & { __amandaHeroYt?: YtPlayer }
                ).__amandaHeroYt = event.target;
              }

              // Poll near the end and restart before ENDED paints end-screen chrome
              if (loopTimer != null) window.clearInterval(loopTimer);
              loopTimer = window.setInterval(() => {
                if (cancelled || failedRef.current) return;
                const player = playerRef.current;
                if (!player) return;
                try {
                  const duration = player.getDuration();
                  const current = player.getCurrentTime();
                  if (!Number.isFinite(duration) || duration < 1) return;
                  if (duration - current <= 0.45 && !restartingRef.current) {
                    restartLoop(player);
                  }
                } catch {
                  // ignore
                }
              }, 120);
            },
            onError: () => {
              if (!cancelled) markFailed();
            },
            onStateChange: (event) => {
              if (failedRef.current) return;
              const state = event.data;
              const ended = window.YT?.PlayerState?.ENDED;
              const paused = window.YT?.PlayerState?.PAUSED;
              const playing = window.YT?.PlayerState?.PLAYING;
              const buffering = window.YT?.PlayerState?.BUFFERING;
              const cued = window.YT?.PlayerState?.CUED;

              if (state === ended) {
                restartLoop(event.target);
                return;
              }

              if (state === cued) {
                setVeil(true);
              }

              if (state === buffering) {
                // Veil post-seek / loop rebuffers (not every mid-play hiccup)
                try {
                  const t = event.target.getCurrentTime();
                  if (restartingRef.current || t < 1.25) setVeil(true);
                } catch {
                  if (restartingRef.current) setVeil(true);
                }
              }

              if (state === playing) {
                if (unveilTimer != null) window.clearTimeout(unveilTimer);
                // Hold cover until play is past the post-seek chrome window
                unveilTimer = window.setTimeout(() => {
                  if (cancelled || failedRef.current) return;
                  try {
                    const player = playerRef.current;
                    const stillPlaying =
                      player &&
                      player.getPlayerState() ===
                        window.YT?.PlayerState?.PLAYING;
                    const t = player?.getCurrentTime() ?? 0;
                    // YouTube keeps a center pause glyph for multiple seconds after seek+play
                    if (!stillPlaying || t < 3.4) {
                      setVeil(true);
                      unveilTimer = window.setTimeout(() => {
                        if (cancelled || failedRef.current) return;
                        const soft = !firstPlayDoneRef.current;
                        firstPlayDoneRef.current = true;
                        setVeil(false, soft);
                        restartingRef.current = false;
                      }, 900);
                      return;
                    }
                  } catch {
                    // fall through and unveil
                  }
                  const soft = !firstPlayDoneRef.current;
                  firstPlayDoneRef.current = true;
                  setVeil(false, soft);
                  restartingRef.current = false;
                }, 900);
                return;
              }

              if (
                state === paused &&
                document.visibilityState !== "hidden"
              ) {
                setVeil(true);
                try {
                  event.target.playVideo();
                } catch {
                  // ignore
                }
              }
            },
          },
        });

        // If we never reach PLAYING, keep the poster permanently
        failTimer = window.setTimeout(() => {
          if (cancelled || failedRef.current || firstPlayDoneRef.current) return;
          markFailed();
        }, 15000);
      })
      .catch(() => {
        if (!cancelled) markFailed();
      });

    return () => {
      cancelled = true;
      if (loopTimer != null) window.clearInterval(loopTimer);
      if (unveilTimer != null) window.clearTimeout(unveilTimer);
      if (failTimer != null) window.clearTimeout(failTimer);
      if (unveilPaintTimerRef.current != null) {
        window.clearTimeout(unveilPaintTimerRef.current);
        unveilPaintTimerRef.current = null;
      }
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      try {
        delete (window as Window & { __amandaHeroYt?: YtPlayer }).__amandaHeroYt;
      } catch {
        // ignore
      }
      host.innerHTML = "";
    };
  }, [mountId, setVeil, videoId]);

  useEffect(() => {
    setMuted(!soundOn);
  }, [setMuted, soundOn]);

  return (
    <div
      ref={rootRef}
      className="intro-mask__video intro-mask__video--youtube"
      data-veiled="1"
      aria-hidden
    >
      <div ref={hostRef} className="intro-mask__youtube-host" />
      {/* CMS poster (fallback yt thumb) — load / loop / buffer / failure cover */}
      <div
        ref={veilRef}
        className="intro-mask__youtube-veil intro-mask__media-poster"
        data-on="1"
        data-soft="0"
        style={{ backgroundImage: `url(${posterUrl})` }}
      />
      {/* Blocks clicks on residual chrome; oversized host clips edge bars */}
      <div className="intro-mask__video-shield" aria-hidden />
    </div>
  );
}
