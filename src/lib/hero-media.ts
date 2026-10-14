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
