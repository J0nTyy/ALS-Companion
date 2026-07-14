import { describe, expect, it } from "vitest";

import { readImageInfo } from "@/application/export/image-info";

/** Build a minimal PNG header with the given dimensions. */
function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13], 8);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  b[16] = (width >>> 24) & 0xff;
  b[17] = (width >>> 16) & 0xff;
  b[18] = (width >>> 8) & 0xff;
  b[19] = width & 0xff;
  b[20] = (height >>> 24) & 0xff;
  b[21] = (height >>> 16) & 0xff;
  b[22] = (height >>> 8) & 0xff;
  b[23] = height & 0xff;
  return b;
}

/** Build a minimal JPEG with an APP0 segment then a SOF0 frame header. */
function jpeg(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0 (length 4, 2 bytes payload)
    0xff, 0xc0, 0x00, 0x11, // SOF0, length 17
    0x08, // precision
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, // components
    ...new Array(9).fill(0), // component specs (ignored)
  ]);
}

describe("readImageInfo", () => {
  it("reads PNG dimensions from the IHDR chunk", () => {
    expect(readImageInfo(png(1024, 768))).toEqual({
      kind: "png",
      width: 1024,
      height: 768,
    });
  });

  it("reads JPEG dimensions from the SOF0 frame header", () => {
    expect(readImageInfo(jpeg(640, 480))).toEqual({
      kind: "jpeg",
      width: 640,
      height: 480,
    });
  });

  it("returns unknown for unrecognised data", () => {
    expect(readImageInfo(new Uint8Array([1, 2, 3, 4]))).toEqual({
      kind: "unknown",
      width: 0,
      height: 0,
    });
  });
});
