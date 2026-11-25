export type SniffedImage = {
  ext: ".jpg" | ".png" | ".gif" | ".webp" | ".avif";
  mime: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "image/avif";
};

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, i) => bytes[i] === byte);
}

const AVIF_BRANDS = new Set(["avif", "avis"]);

function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return false;
  if (AVIF_BRANDS.has(ascii(bytes, 8, 4))) return true;
  const boxSize = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0);
  const end = Math.min(boxSize, bytes.length, 256);
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    if (AVIF_BRANDS.has(ascii(bytes, offset, 4))) return true;
  }
  return false;
}

/**
 * Identify a raster image from its leading bytes. Anything else (SVG, HTML,
 * renamed files) returns null — file names and declared MIME types are ignored.
 */
export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: ".jpg", mime: "image/jpeg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ext: ".png", mime: "image/png" };
  }
  const head = ascii(bytes, 0, 6);
  if (head === "GIF87a" || head === "GIF89a") return { ext: ".gif", mime: "image/gif" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return { ext: ".webp", mime: "image/webp" };
  }
  if (isAvif(bytes)) return { ext: ".avif", mime: "image/avif" };
  return null;
}
