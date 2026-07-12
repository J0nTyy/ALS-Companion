/**
 * Pure image-transform model shared by the single-image viewer and the MRI
 * comparison workspace. No React, no DOM — just the maths of zoom/pan so it can be
 * unit-tested and reused without duplicating viewer logic.
 *
 * A transform is a uniform `scale` (clamped to [MIN,MAX], where 1 = fit-to-window
 * because the image is object-contained at scale 1) plus a pixel `offset` (pan).
 */

export interface ImageTransform {
  scale: number;
  offset: { x: number; y: number };
}

export const MIN_SCALE = 1;
export const MAX_SCALE = 8;

export const IDENTITY_TRANSFORM: ImageTransform = {
  scale: 1,
  offset: { x: 0, y: 0 },
};

export function clampScale(scale: number): number {
  // NaN can't be ordered, so map it to the safe minimum; ±Infinity clamp normally.
  if (Number.isNaN(scale)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Multiply the current scale by `factor` (clamped). Offset is unchanged. */
export function zoomTransform(
  transform: ImageTransform,
  factor: number,
): ImageTransform {
  return { scale: clampScale(transform.scale * factor), offset: transform.offset };
}

/** Translate by a pixel delta. Scale is unchanged. */
export function panTransform(
  transform: ImageTransform,
  dx: number,
  dy: number,
): ImageTransform {
  return {
    scale: transform.scale,
    offset: { x: transform.offset.x + dx, y: transform.offset.y + dy },
  };
}

/**
 * Imperative controller an {@link ImageViewer} uses to read and change its
 * transform. In uncontrolled mode the viewer creates its own; the comparison
 * workspace supplies sync-aware controllers so two viewers can move together
 * without the viewer knowing anything about synchronization.
 */
export interface ImageViewerController {
  transform: ImageTransform;
  zoomBy(factor: number): void;
  panBy(dx: number, dy: number): void;
  reset(): void;
  fit(): void;
}
