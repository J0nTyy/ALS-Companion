import {
  annotationTypeForGeometry,
  isAnnotationType,
  parseAnnotationGeometry,
  type Annotation,
} from "@/domain/entities/annotation";

/**
 * A row as returned by SQLite for the `annotations` table. Columns are snake_case;
 * `label` and `notes` may be NULL. `geometry` is the opaque serialized string
 * (JSON of normalized coordinates) — never spread across coordinate columns.
 *
 * No Tauri import, so the mapping logic is unit-testable in a plain Node env.
 */
export interface AnnotationRow {
  id: string;
  stored_file_id: string;
  annotation_type: string;
  label: string | null;
  geometry: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link Annotation}, failing loudly on corrupt
 * data: an unrecognized type, geometry that isn't valid JSON / a known shape, or a
 * type that disagrees with its geometry.
 */
export function mapRowToAnnotation(row: AnnotationRow): Annotation {
  if (!isAnnotationType(row.annotation_type)) {
    throw new Error(
      `Annotation ${row.id} has an unrecognized type: ${String(row.annotation_type)}`,
    );
  }

  // Throws on malformed JSON or an invalid/unknown shape.
  const geometry = parseAnnotationGeometry(row.geometry);

  if (row.annotation_type !== annotationTypeForGeometry(geometry)) {
    throw new Error(
      `Annotation ${row.id} type "${row.annotation_type}" does not match its geometry "${geometry.kind}"`,
    );
  }

  const label = row.label?.trim() ?? "";
  const notes = row.notes?.trim() ?? "";

  return {
    id: row.id,
    storedFileId: row.stored_file_id,
    annotationType: row.annotation_type,
    geometry,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(label.length > 0 ? { label } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
