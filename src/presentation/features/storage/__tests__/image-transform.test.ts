import { describe, expect, it } from "vitest";

import {
  clampScale,
  IDENTITY_TRANSFORM,
  MAX_SCALE,
  MIN_SCALE,
  panTransform,
  zoomTransform,
} from "@/presentation/features/storage/image-transform";

describe("clampScale", () => {
  it("clamps to [MIN, MAX] and defends against non-finite input", () => {
    expect(clampScale(0.1)).toBe(MIN_SCALE);
    expect(clampScale(1000)).toBe(MAX_SCALE);
    expect(clampScale(3)).toBe(3);
    expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(MAX_SCALE);
  });
});

describe("zoomTransform", () => {
  it("multiplies the scale and leaves the offset untouched", () => {
    const t = { scale: 2, offset: { x: 5, y: -3 } };
    const zoomed = zoomTransform(t, 2);
    expect(zoomed.scale).toBe(4);
    expect(zoomed.offset).toEqual({ x: 5, y: -3 });
  });

  it("cannot zoom out past fit (MIN_SCALE) or past MAX_SCALE", () => {
    expect(zoomTransform(IDENTITY_TRANSFORM, 0.5).scale).toBe(MIN_SCALE);
    expect(zoomTransform({ scale: 6, offset: { x: 0, y: 0 } }, 4).scale).toBe(
      MAX_SCALE,
    );
  });
});

describe("panTransform", () => {
  it("accumulates the offset and leaves the scale untouched", () => {
    const t = { scale: 3, offset: { x: 10, y: 10 } };
    const panned = panTransform(t, -4, 6);
    expect(panned.offset).toEqual({ x: 6, y: 16 });
    expect(panned.scale).toBe(3);
  });
});
