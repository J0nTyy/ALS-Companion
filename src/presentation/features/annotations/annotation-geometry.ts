import type {
  Annotation,
  PointGeometry,
  RectangleGeometry,
} from "@/domain/entities/annotation";

/**
 * Pure geometry math that drives annotation rendering and drawing. No React, no
 * DOM — just the maps between screen pixels and the image's normalized [0,1]
 * coordinate space, so it can be unit-tested and reused without a viewer.
 *
 * The overlay is positioned to exactly cover the image's *content box* (the
 * letterboxed area an `object-contain` image actually occupies), so normalized
 * coordinates map to on-screen positions with a simple multiply.
 */

export interface Size {
  width: number;
  height: number;
}

/** A minimal rectangle shape (a subset of the DOM's DOMRect) for pointer maths. */
export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * The size of an image displayed "contained" (fit, letterboxed) inside a
 * container at scale 1. Returns {0,0} if either size is degenerate.
 */
export function fitContainSize(container: Size, natural: Size): Size {
  if (
    container.width <= 0 ||
    container.height <= 0 ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return { width: 0, height: 0 };
  }
  const containerAspect = container.width / container.height;
  const imageAspect = natural.width / natural.height;
  if (imageAspect > containerAspect) {
    // Width-limited: the image spans the container's width.
    const width = container.width;
    return { width, height: width / imageAspect };
  }
  // Height-limited: the image spans the container's height.
  const height = container.height;
  return { width: height * imageAspect, height };
}

/**
 * Convert a screen point to normalized image coordinates using the content box's
 * on-screen rectangle (already reflects any zoom/pan). Clamped to [0, 1].
 */
export function normalizedFromPoint(
  rect: RectLike,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

/** A normalized point geometry from two coordinates. */
export function pointGeometryAt(x: number, y: number): PointGeometry {
  return { kind: "point", x: clamp01(x), y: clamp01(y) };
}

/**
 * A normalized rectangle from two (normalized) corner points, in any drag
 * direction — the result always has a top-left origin and positive width/height.
 */
export function rectangleFromCorners(
  a: { x: number; y: number },
  b: { x: number; y: number },
): RectangleGeometry {
  const ax = clamp01(a.x);
  const ay = clamp01(a.y);
  const bx = clamp01(b.x);
  const by = clamp01(b.y);
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return {
    kind: "rectangle",
    x,
    y,
    width: Math.abs(ax - bx),
    height: Math.abs(ay - by),
  };
}

/** CSS percentage strings (0–100%) for absolutely positioning a normalized value. */
export function percent(n: number): string {
  return `${clamp01(n) * 100}%`;
}

/**
 * Resolve the currently-selected annotation from the list. Returns null when
 * nothing is selected or the selected id is no longer present (e.g. after a
 * delete) — so callers can render/clear selection safely.
 */
export function resolveSelected(
  annotations: readonly Annotation[],
  selectedId: string | null,
): Annotation | null {
  if (selectedId === null) return null;
  return annotations.find((a) => a.id === selectedId) ?? null;
}

// --- editing: drag-to-move and resize (all normalized, clamped to [0,1]) ---

/** Move a point by a normalized delta, keeping it inside the image. */
export function translatePoint(
  point: PointGeometry,
  dx: number,
  dy: number,
): PointGeometry {
  return { kind: "point", x: clamp01(point.x + dx), y: clamp01(point.y + dy) };
}

/**
 * Move a rectangle by a normalized delta, keeping its whole body inside the image
 * (its size is unchanged — the edges stop at the image bounds).
 */
export function translateRectangle(
  rect: RectangleGeometry,
  dx: number,
  dy: number,
): RectangleGeometry {
  const x = Math.min(Math.max(0, rect.x + dx), 1 - rect.width);
  const y = Math.min(Math.max(0, rect.y + dy), 1 - rect.height);
  return { kind: "rectangle", x, y, width: rect.width, height: rect.height };
}

/** The four draggable corners of a rectangle. */
export type RectHandle = "nw" | "ne" | "sw" | "se";

/**
 * Resize a rectangle by dragging one corner by a normalized delta; the opposite
 * corner stays fixed. Enforces a minimum size and keeps the result inside [0,1].
 */
export function resizeRectangle(
  rect: RectangleGeometry,
  handle: RectHandle,
  dx: number,
  dy: number,
  minSize = 0.02,
): RectangleGeometry {
  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  const moving = {
    x: clamp01((handle === "nw" || handle === "sw" ? left : right) + dx),
    y: clamp01((handle === "nw" || handle === "ne" ? top : bottom) + dy),
  };
  const fixed = {
    x: handle === "nw" || handle === "sw" ? right : left,
    y: handle === "nw" || handle === "ne" ? bottom : top,
  };

  const base = rectangleFromCorners(moving, fixed);
  const width = Math.max(minSize, base.width);
  const height = Math.max(minSize, base.height);
  return {
    kind: "rectangle",
    x: Math.max(0, Math.min(base.x, 1 - width)),
    y: Math.max(0, Math.min(base.y, 1 - height)),
    width,
    height,
  };
}
