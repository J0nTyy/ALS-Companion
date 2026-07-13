import type {
  Annotation,
  AnnotationGeometry,
  PointGeometry,
  RectangleGeometry,
} from "@/domain/entities/annotation";

/**
 * MeasurementEngine (v1.6) — pure, deterministic mathematics DERIVED from an
 * annotation's geometry. Framework-free: no React, DOM, SQLite, or Tauri.
 *
 * DESIGN PRINCIPLE: annotations are researcher-created data (persisted);
 * measurements are computed from them and are NEVER persisted — there is no
 * measurement table, repository, or service. Presentation calls this engine and
 * only *formats* the numbers; it performs no geometry maths itself.
 *
 * Coordinates in annotation geometry are NORMALIZED ([0,1] of the image). When the
 * image's natural pixel dimensions are known, this engine also returns the pixel
 * equivalents; when they aren't, pixel results are `null` (values are never
 * fabricated). Adding a future annotation shape means adding a case here and a
 * result variant — no redesign.
 *
 * OUT OF SCOPE (enforced): millimetre calibration, intensity/histograms, ROI
 * statistics, pixel sampling, segmentation, OpenCV, AI, DICOM, persistence.
 */

/** Natural image size in pixels. */
export interface ImageDimensions {
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface PointMeasurement {
  kind: "point";
  /** Normalized [0,1] coordinates (always available). */
  normalized: Vec2;
  /** Pixel coordinates, or null when image dimensions are unavailable. */
  pixels: Vec2 | null;
}

export interface RectangleMeasurement {
  kind: "rectangle";
  /** width ÷ height — from pixels when available, else from normalized dims. */
  aspectRatio: number;
  normalized: {
    topLeft: Vec2;
    bottomRight: Vec2;
    center: Vec2;
    width: number;
    height: number;
  };
  /** Pixel-space results, or null when image dimensions are unavailable. */
  pixels: {
    topLeft: Vec2;
    bottomRight: Vec2;
    center: Vec2;
    width: number;
    height: number;
    /** Area in pixels². */
    area: number;
    /** Perimeter in pixels. */
    perimeter: number;
  } | null;
}

export type Measurement = PointMeasurement | RectangleMeasurement;

/** Whether usable pixel dimensions are available (positive, finite). */
function hasPixels(
  image: ImageDimensions | null | undefined,
): image is ImageDimensions {
  return (
    !!image &&
    Number.isFinite(image.width) &&
    Number.isFinite(image.height) &&
    image.width > 0 &&
    image.height > 0
  );
}

function measurePoint(
  geometry: PointGeometry,
  image: ImageDimensions | null,
): PointMeasurement {
  return {
    kind: "point",
    normalized: { x: geometry.x, y: geometry.y },
    pixels: hasPixels(image)
      ? { x: geometry.x * image.width, y: geometry.y * image.height }
      : null,
  };
}

function measureRectangle(
  geometry: RectangleGeometry,
  image: ImageDimensions | null,
): RectangleMeasurement {
  const { x, y, width, height } = geometry;
  const topLeft: Vec2 = { x, y };
  const bottomRight: Vec2 = { x: x + width, y: y + height };
  const center: Vec2 = { x: x + width / 2, y: y + height / 2 };

  // Default aspect ratio from normalized dims; overridden with the true pixel
  // aspect below when image dimensions are available.
  let aspectRatio = height > 0 ? width / height : 0;
  let pixels: RectangleMeasurement["pixels"] = null;

  if (hasPixels(image)) {
    const toPx = (p: Vec2): Vec2 => ({
      x: p.x * image.width,
      y: p.y * image.height,
    });
    const pixelWidth = width * image.width;
    const pixelHeight = height * image.height;
    pixels = {
      topLeft: toPx(topLeft),
      bottomRight: toPx(bottomRight),
      center: toPx(center),
      width: pixelWidth,
      height: pixelHeight,
      area: pixelWidth * pixelHeight,
      perimeter: 2 * (pixelWidth + pixelHeight),
    };
    aspectRatio = pixelHeight > 0 ? pixelWidth / pixelHeight : 0;
  }

  return {
    kind: "rectangle",
    aspectRatio,
    normalized: { topLeft, bottomRight, center, width, height },
    pixels,
  };
}

/**
 * Compute the measurement for one annotation geometry. Exhaustive over the
 * geometry union — a new shape must add a case here (a compile error prompts it).
 */
export function measureAnnotation(
  geometry: AnnotationGeometry,
  image?: ImageDimensions | null,
): Measurement {
  switch (geometry.kind) {
    case "point":
      return measurePoint(geometry, image ?? null);
    case "rectangle":
      return measureRectangle(geometry, image ?? null);
  }
}

/**
 * Convenience for the ROI inspector: measure the selected annotation, or return
 * null when nothing is selected (the inspector's honest empty state).
 */
export function inspectAnnotation(
  annotation: Annotation | null,
  image?: ImageDimensions | null,
): Measurement | null {
  if (!annotation) return null;
  return measureAnnotation(annotation.geometry, image ?? null);
}
