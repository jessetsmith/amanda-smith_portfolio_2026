export type HeroMediaKind = "youtube" | "video" | "none";

export const YOUTUBE_EMBED_HOST = "https://www.youtube-nocookie.com";

export interface HeroMedia {
  kind: HeroMediaKind;
  /** Direct file URL for native <video> */
  videoUrl?: string;
  /** YouTube video id when kind === "youtube" */
  youtubeId?: string;
}

/**
 * Build the privacy-enhanced YouTube embed URL for immediate SSR mounting.
 * Omits deprecated params (showinfo, autohide, modestbranding) and enables
 * the IFrame API so YT.Player can attach without reloading the iframe.
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    disablekb: "1",
    fs: "0",
    playsinline: "1",
    rel: "0",
    // Manual seamless loop (seek before end) — playlist loop still flashes chrome
    loop: "0",
    iv_load_policy: "3",
    cc_load_policy: "0",
    enablejsapi: "1",
  });
  return `${YOUTUBE_EMBED_HOST}/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/**
 * Ask Sanity's image CDN for a modern format (AVIF/WebP) capped at 1920px so
 * raw 4K poster uploads do not compete with the hero video stream.
 */
export function optimizeHeroImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "cdn.sanity.io" &&
      parsed.pathname.startsWith("/images/") &&
      !parsed.searchParams.has("auto") &&
      !parsed.searchParams.has("w")
    ) {
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "max");
      parsed.searchParams.set("w", "1920");
      parsed.searchParams.set("q", "80");
      return parsed.toString();
    }
  } catch {
    // relative or non-standard URL — leave unchanged
  }
  return url;
}

/** Extract an 11-char YouTube id from watch / youtu.be / embed / shorts URLs. */
export function parseYouTubeId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return isYouTubeId(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const v = url.searchParams.get("v");
      if (isYouTubeId(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      const marker = parts[0];
      if (
        (marker === "embed" ||
          marker === "shorts" ||
          marker === "live" ||
          marker === "v") &&
        isYouTubeId(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    // fall through
  }

  // Bare id
  if (isYouTubeId(value)) return value;
  return null;
}

function isYouTubeId(value: string | null | undefined): value is string {
  return Boolean(value && /^[\w-]{11}$/.test(value));
}

export function resolveHeroMedia(videoSrc: string | undefined | null): HeroMedia {
  const raw = (videoSrc ?? "").trim();
  if (!raw) return { kind: "none" };

  const youtubeId = parseYouTubeId(raw);
  if (youtubeId) return { kind: "youtube", youtubeId };

  return { kind: "video", videoUrl: raw };
}

/** True when the string looks like a usable still image URL (not a YouTube page). */
export function isLikelyImageUrl(raw: string | undefined | null): boolean {
  const value = (raw ?? "").trim();
  if (!value) return false;
  // Poster fields sometimes get a watch URL by mistake — never use that as <img src>
  if (parseYouTubeId(value)) return false;

  if (value.startsWith("/")) return true;
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    if (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Prefer CMS posterUrl, then imageUrl, then a YouTube thumbnail when applicable.
 */
export function resolveHeroPoster(
  posterUrl?: string | null,
  imageUrl?: string | null,
  youtubeId?: string | null,
): string | undefined {
  if (isLikelyImageUrl(posterUrl)) return optimizeHeroImageUrl(posterUrl!.trim());
  if (isLikelyImageUrl(imageUrl)) return optimizeHeroImageUrl(imageUrl!.trim());
  if (youtubeId && isYouTubeId(youtubeId)) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  return undefined;
}
