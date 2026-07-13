import {
  isAnnotationRelationshipType,
  type AnnotationLink,
} from "@/domain/entities/annotation-link";

/**
 * A row as returned by SQLite for the `annotation_links` table. Columns are
 * snake_case; `notes` may be NULL. No Tauri import, so the mapping is unit-testable
 * in a plain Node env.
 */
export interface AnnotationLinkRow {
  id: string;
  source_annotation_id: string;
  target_annotation_id: string;
  relationship_type: string;
  notes: string | null;
  created_at: string;
}

/** Map a row to a domain {@link AnnotationLink}, failing loudly on a bad type. */
export function mapRowToAnnotationLink(row: AnnotationLinkRow): AnnotationLink {
  if (!isAnnotationRelationshipType(row.relationship_type)) {
    throw new Error(
      `Annotation link ${row.id} has an unrecognized relationship type: ${String(row.relationship_type)}`,
    );
  }
  const notes = row.notes?.trim() ?? "";
  return {
    id: row.id,
    sourceAnnotationId: row.source_annotation_id,
    targetAnnotationId: row.target_annotation_id,
    relationshipType: row.relationship_type,
    createdAt: row.created_at,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
