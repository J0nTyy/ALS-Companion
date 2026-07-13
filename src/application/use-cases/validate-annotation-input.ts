import {
  annotationTypeForGeometry,
  isAnnotationType,
  isValidAnnotationGeometry,
  type AnnotationGeometry,
  type AnnotationType,
} from "@/domain/entities/annotation";
import { ValidationError } from "@/application/errors";

/** Raw fields coming from the annotation tools / a form. */
export interface AnnotationFieldsInput {
  annotationType?: string;
  geometry?: unknown;
  label?: string;
  notes?: string;
}

/** Clean, validated fields ready to build an {@link Annotation}. */
export interface ValidatedAnnotationFields {
  annotationType: AnnotationType;
  geometry: AnnotationGeometry;
  label?: string;
  notes?: string;
}

/**
 * Validate and normalize an annotation's fields.
 *
 * - `geometry` must be a recognized, valid shape (finite normalized coordinates;
 *   a rectangle with positive size that stays inside the image).
 * - `annotationType` must be a known type AND agree with the geometry's `kind`
 *   (a "point" type can't carry rectangle geometry).
 * - `label` and `notes` are optional; trimmed, and a blank is dropped.
 */
export function validateAnnotationFields(
  input: AnnotationFieldsInput,
): ValidatedAnnotationFields {
  if (!isValidAnnotationGeometry(input.geometry)) {
    throw new ValidationError(
      "That annotation shape isn't valid. Please draw it again.",
      "geometry",
    );
  }
  const geometry = input.geometry;

  const annotationType = input.annotationType ?? geometry.kind;
  if (!isAnnotationType(annotationType)) {
    throw new ValidationError(
      "Please choose a valid annotation type.",
      "annotationType",
    );
  }
  if (annotationType !== annotationTypeForGeometry(geometry)) {
    throw new ValidationError(
      "The annotation type doesn't match its shape.",
      "annotationType",
    );
  }

  const label = (input.label ?? "").trim();
  const notes = (input.notes ?? "").trim();

  return {
    annotationType,
    geometry,
    ...(label.length > 0 ? { label } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
