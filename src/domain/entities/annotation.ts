/**
 * Domain entity: Annotation
 * ----------------------------------------------------------------------------
 * A researcher-drawn mark on a stored MRI image — the persistent foundation of
 * the imaging-analysis chain established in v1.5:
 *
 *   StoredFile → **Annotation** → (future) Measurements → (future) AI
 *
 * An Annotation belongs to exactly one {@link StoredFile} (a real, viewable image).
 * It is deliberately simple this milestone — a Point or a Rectangle — but the model
 * is built so richer types (polygon, freehand, ROI, …) and future measurement /
 * AI layers extend it **without a schema redesign**. Framework-free: no React,
 * SQLite, or Tauri.
 *
 * COORDINATES ARE NORMALIZED. Every geometry value is a fraction in [0, 1] of the
 * image's own width/height, so an annotation is independent of display size, zoom,
 * pan, and window resizing — it always points at the same spot on the image.
 *
 * SCOPE (v1.5): point + rectangle only. NO measurements (distance/area/intensity),
 * ROI tools, overlays, comparison annotations, freehand/polygon, DICOM, or AI.
 */

export const ANNOTATION_TYPES = ["point", "rectangle"] as const;

export type AnnotationType = (typeof ANNOTATION_TYPES)[number];

/** A single normalized point on the image (x, y ∈ [0, 1]). */
export interface PointGeometry {
  kind: "point";
  x: number;
  y: number;
}

/**
 * An axis-aligned rectangle in normalized coordinates. `(x, y)` is the top-left
 * corner and `width`/`height` are positive fractions; the rectangle stays within
 * the image (x + width ≤ 1, y + height ≤ 1).
 */
export interface RectangleGeometry {
  kind: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The serialized geometry of an annotation. A discriminated union keyed by `kind`
 * so new shapes are added here (and validated) with no schema change — the
 * database stores this as one opaque JSON string.
 */
export type AnnotationGeometry = PointGeometry | RectangleGeometry;

export interface Annotation {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The stored image this annotation is drawn on. */
  readonly storedFileId: string;
  /** Which kind of mark this is; matches `geometry.kind`. */
  annotationType: AnnotationType;
  /** Optional short researcher-facing label. */
  label?: string;
  /** The mark's shape, in normalized image coordinates. */
  geometry: AnnotationGeometry;
  /** Optional free-text notes. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields provided when creating an annotation. */
export type NewAnnotationInput = {
  storedFileId: string;
  annotationType: AnnotationType;
  geometry: AnnotationGeometry;
  label?: string;
  notes?: string;
};

/** Fields a researcher can change when editing an annotation. */
export type UpdateAnnotationInput = {
  id: string;
  annotationType: AnnotationType;
  geometry: AnnotationGeometry;
  label?: string;
  notes?: string;
};

/** User-facing labels for each annotation type. */
export const ANNOTATION_TYPE_META: Record<AnnotationType, { label: string }> = {
  point: { label: "Point" },
  rectangle: { label: "Rectangle" },
};

export function isAnnotationType(value: unknown): value is AnnotationType {
  return (
    typeof value === "string" &&
    (ANNOTATION_TYPES as readonly string[]).includes(value)
  );
}

/** True when `n` is a finite fraction within [0, 1] (inclusive). */
function isUnitInterval(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
}

/**
 * Validate a geometry value: coordinates must be finite fractions in [0, 1], a
 * rectangle must have positive width/height and stay inside the image. This is the
 * single source of truth for "valid geometry" used by both the application layer
 * (input validation) and the infrastructure layer (loud row mapping).
 */
export function isValidAnnotationGeometry(
  geometry: unknown,
): geometry is AnnotationGeometry {
  if (typeof geometry !== "object" || geometry === null) return false;
  const g = geometry as { kind?: unknown };
  switch (g.kind) {
    case "point": {
      const p = geometry as PointGeometry;
      return isUnitInterval(p.x) && isUnitInterval(p.y);
    }
    case "rectangle": {
      const r = geometry as RectangleGeometry;
      return (
        isUnitInterval(r.x) &&
        isUnitInterval(r.y) &&
        isUnitInterval(r.width) &&
        isUnitInterval(r.height) &&
        r.width > 0 &&
        r.height > 0 &&
        r.x + r.width <= 1 + 1e-9 &&
        r.y + r.height <= 1 + 1e-9
      );
    }
    default:
      return false;
  }
}

/** The {@link AnnotationType} implied by a geometry's `kind`. */
export function annotationTypeForGeometry(
  geometry: AnnotationGeometry,
): AnnotationType {
  return geometry.kind;
}

/** Serialize geometry to the opaque JSON string stored in the database. */
export function serializeAnnotationGeometry(
  geometry: AnnotationGeometry,
): string {
  return JSON.stringify(geometry);
}

/**
 * Parse a stored geometry string back into a validated {@link AnnotationGeometry}.
 * Throws on malformed JSON or geometry that fails validation, so corrupt rows fail
 * loudly rather than rendering a broken mark.
 */
export function parseAnnotationGeometry(raw: string): AnnotationGeometry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Annotation geometry is not valid JSON.");
  }
  if (!isValidAnnotationGeometry(parsed)) {
    throw new Error("Annotation geometry is not a recognized, valid shape.");
  }
  return parsed;
}
