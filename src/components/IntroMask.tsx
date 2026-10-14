"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { resolveHeroMedia } from "@/lib/hero-media";

interface IntroMaskProps {
  maskText: string;
  support: string;
  videoSrc: string;
  posterSrc?: string;
  /** Used when videoSrc is empty (still cover). */
  imageSrc?: string;
  /** Optional “watch full video” link (new tab). */
  watchUrl?: string;
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
          };
        },
      ) => YtPlayer;
      PlayerState?: { ENDED: number; PLAYING: number; PAUSED: number };
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

export function IntroMask({
  maskText,
  support,
  videoSrc,
  posterSrc,
  imageSrc,
  watchUrl,
}: IntroMaskProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const hazeRef = useRef<HTMLSpanElement>(null);
  const titleRegionRef = useRef<HTMLDivElement>(null);
  const media = resolveHeroMedia(videoSrc);
  const hasPlayable = media.kind === "video" || media.kind === "youtube";
  const watchHref = watchUrl?.trim() || "";
  const [soundOn, setSoundOn] = useState(false);
  const soundApiRef = useRef<{ setMuted: (muted: boolean) => void } | null>(
    null,
  );

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

  const setSpotlight = (xPx: number, yPx: number, spot: string) => {
    const haze = hazeRef.current;
    if (!haze) return;
    haze.style.setProperty("--haze-x", `${xPx}px`);
    haze.style.setProperty("--haze-y", `${yPx}px`);
    haze.style.setProperty("--haze-spot", spot);
  };

  const clearSpotlight = () => {
    setSpotlight(0, 0, "0px");
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const haze = hazeRef.current;
    if (!haze) return;
    const rect = haze.getBoundingClientRect();
    setSpotlight(
      event.clientX - rect.left,
      event.clientY - rect.top,
      "7.5rem",
    );
  };

  const onFocus = () => {
    const haze = hazeRef.current;
    if (!haze) return;
    setSpotlight(haze.clientWidth / 2, haze.clientHeight / 2, "7.5rem");
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundApiRef.current?.setMuted(!next);
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

        {/* Video/image + cloud haze + destination-out solid name (one solid layer) */}
        <div className="intro-mask__punch">
          {media.kind === "video" && media.videoUrl ? (
            <>
              <NativeHeroVideo
                src={media.videoUrl}
                poster={posterSrc || imageSrc}
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
              soundOn={soundOn}
              registerApi={(api) => {
                soundApiRef.current = api;
              }}
            />
          ) : imageSrc || posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="intro-mask__video"
              src={imageSrc || posterSrc}
              alt=""
            />
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
            {maskText}
          </h1>
        </div>

        <div className="intro-mask__content">
          {/* Outline-only twin (transparent fill + white stroke), stacked/offset */}
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
            <p className="intro-mask__title-readable" aria-hidden>
              {maskText}
            </p>
          </div>
          <p className="intro-mask__support">{support}</p>
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
                Watch full video
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
                aria-label={soundOn ? "Mute cover video" : "Unmute cover video"}
                title={
                  soundOn
                    ? "Sound on — click to mute"
                    : "Sound off — click to unmute"
                }
              >
                <SoundIcon on={soundOn} />
                <span>{soundOn ? "Sound on" : "Sound off"}</span>
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

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    registerApi({
      setMuted: (muted) => {
        el.muted = muted;
        if (!muted) {
          el.volume = 1;
          void el.play().catch(() => undefined);
        }
      },
    });
    void el.play().catch(() => undefined);
    return () => {
      registerApi({ setMuted: () => undefined });
    };
  }, [registerApi, src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !soundOn;
    if (!soundOn) return;
    el.volume = 1;
    void el.play().catch(() => undefined);
  }, [soundOn]);

  return (
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
  );
}

function YouTubeHeroVideo({
  videoId,
  soundOn,
  registerApi,
}: {
  videoId: string;
  soundOn: boolean;
  registerApi: (api: { setMuted: (muted: boolean) => void }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const reactId = useId().replace(/:/g, "");
  const mountId = `yt-hero-${reactId}`;
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const setMuted = useCallback((muted: boolean) => {
    const player = playerRef.current;
    if (!player) return;
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
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = "";
    const mount = document.createElement("div");
    mount.id = mountId;
    host.appendChild(mount);

    void loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
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
          loop: 1,
          playlist: videoId,
          iv_load_policy: 3,
          cc_load_policy: 0,
          // Hide as much YouTube chrome as the embed API allows
          showinfo: 0,
          autohide: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            event.target.mute();
            event.target.playVideo();
            if (soundOnRef.current) {
              event.target.unMute();
              event.target.setVolume(100);
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            const ended = window.YT?.PlayerState?.ENDED;
            const paused = window.YT?.PlayerState?.PAUSED;
            // Keep playing so the big YouTube play overlay never sticks
            if (state === ended || state === paused) {
              event.target.playVideo();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      host.innerHTML = "";
    };
  }, [mountId, videoId]);

  useEffect(() => {
    setMuted(!soundOn);
  }, [setMuted, soundOn]);

  return (
    <div className="intro-mask__video intro-mask__video--youtube" aria-hidden>
      <div ref={hostRef} className="intro-mask__youtube-host" />
      {/* Blocks clicks on any residual YouTube chrome; Sound/Watch sit above */}
      <div className="intro-mask__video-shield" aria-hidden />
    </div>
  );
}
