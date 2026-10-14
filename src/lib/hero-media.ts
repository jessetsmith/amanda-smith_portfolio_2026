export type HeroMediaKind = "youtube" | "video" | "none";

export interface HeroMedia {
  kind: HeroMediaKind;
  /** Direct file URL for native <video> */
  videoUrl?: string;
  /** YouTube video id when kind === "youtube" */
  youtubeId?: string;
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
  if (isLikelyImageUrl(posterUrl)) return posterUrl!.trim();
  if (isLikelyImageUrl(imageUrl)) return imageUrl!.trim();
  if (youtubeId && isYouTubeId(youtubeId)) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }
  return undefined;
}
