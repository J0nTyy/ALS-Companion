/**
 * Tiny, dependency-free image header parsers. Given raw PNG or JPEG bytes they read
 * only the pixel DIMENSIONS from the header (never decode the pixels) — enough to
 * lay an image out at the right aspect ratio when embedding it in a DOCX report.
 * Pure and framework-free.
 */

export type ImageKind = "png" | "jpeg" | "unknown";

export interface ImageInfo {
  kind: ImageKind;
  /** Intrinsic width in pixels (0 when it could not be determined). */
  width: number;
  /** Intrinsic height in pixels (0 when it could not be determined). */
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function u16(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
}

function u32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) * 0x1000000 +
      ((bytes[at + 1] ?? 0) << 16) +
      ((bytes[at + 2] ?? 0) << 8) +
      (bytes[at + 3] ?? 0)) >>>
    0
  );
}

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/** Read PNG dimensions from the IHDR chunk (immediately after the 8-byte signature). */
function pngInfo(bytes: Uint8Array): ImageInfo {
  // Signature(8) + chunk length(4) + "IHDR"(4) → width(4) at offset 16, height at 20.
  return { kind: "png", width: u32(bytes, 16), height: u32(bytes, 20) };
}

/** Read JPEG dimensions from the first Start-Of-Frame (SOFn) marker segment. */
function jpegInfo(bytes: Uint8Array): ImageInfo {
  const len = bytes.length;
  let i = 2; // skip the SOI marker (FF D8)
  while (i + 1 < len) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    let marker = bytes[i + 1] ?? 0;
    // Skip any fill bytes (a run of 0xFF) before the real marker.
    while (marker === 0xff && i + 1 < len) {
      i += 1;
      marker = bytes[i + 1] ?? 0;
    }
    i += 2;
    // Standalone markers carry no length: SOI/EOI, the restart markers, and TEM.
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0x01
    ) {
      continue;
    }
    if (i + 1 >= len) break;
    const segLen = u16(bytes, i);
    // SOFn frame headers are C0–CF EXCEPT DHT (C4), JPG (C8) and DAC (CC).
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      // segment: length(2) precision(1) height(2) width(2) components(1)
      return { kind: "jpeg", height: u16(bytes, i + 3), width: u16(bytes, i + 5) };
    }
    i += segLen;
  }
  return { kind: "jpeg", width: 0, height: 0 };
}

/** Detect the format and read the pixel dimensions of a PNG or JPEG image. */
export function readImageInfo(bytes: Uint8Array): ImageInfo {
  if (isPng(bytes)) return pngInfo(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegInfo(bytes);
  return { kind: "unknown", width: 0, height: 0 };
}
