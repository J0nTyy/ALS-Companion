import { isAnnotationType } from "@/domain/entities/annotation";
import { isStudyStatus } from "@/domain/entities/study";
import type {
  AnnotatedContext,
  AnnotationContextReader,
} from "@/application/ports/annotation-context-reader";
import { getDatabase } from "@/infrastructure/db/database";

/** A joined row over annotation → stored_file → asset → session → event → animal → study. */
interface ContextRow {
  annotation_id: string;
  label: string | null;
  annotation_type: string;
  stored_file_id: string;
  study_id: string;
  study_name: string;
  study_status: string;
  animal_id: string;
  animal_identifier: string;
  timeline_event_id: string;
  mri_session_id: string;
  mri_session_title: string;
  acquisition_date: string;
}

// The shared join from an annotation up to its study. Only "mri_session"-owned
// assets exist today; the join encodes that (matching the rest of the app).
const CONTEXT_SELECT = `SELECT
    an.id AS annotation_id, an.label, an.annotation_type, an.stored_file_id,
    s.id AS study_id, s.name AS study_name, s.status AS study_status,
    a.id AS animal_id, a.animal_identifier,
    te.id AS timeline_event_id,
    m.id AS mri_session_id, m.title AS mri_session_title, m.acquisition_date
  FROM annotations an
  JOIN stored_files sf ON sf.id = an.stored_file_id
  JOIN research_assets ra ON ra.id = sf.research_asset_id
  JOIN mri_sessions m ON ra.owner_type = 'mri_session' AND m.id = ra.owner_id
  JOIN timeline_events te ON te.id = m.timeline_event_id
  JOIN animals a ON a.id = te.animal_id
  JOIN studies s ON s.id = a.study_id`;

function mapRow(row: ContextRow): AnnotatedContext {
  const annotationType = isAnnotationType(row.annotation_type)
    ? row.annotation_type
    : null;
  if (!annotationType) {
    throw new Error(
      `Annotation ${row.annotation_id} has an unrecognized type: ${String(row.annotation_type)}`,
    );
  }
  if (!isStudyStatus(row.study_status)) {
    throw new Error(
      `Study ${row.study_id} has an unrecognized status: ${String(row.study_status)}`,
    );
  }
  const label = row.label?.trim() ?? "";
  return {
    annotationId: row.annotation_id,
    label: label.length > 0 ? label : null,
    annotationType,
    storedFileId: row.stored_file_id,
    studyId: row.study_id,
    studyName: row.study_name,
    studyStatus: row.study_status,
    animalId: row.animal_id,
    animalIdentifier: row.animal_identifier,
    timelineEventId: row.timeline_event_id,
    mriSessionId: row.mri_session_id,
    mriSessionTitle: row.mri_session_title,
    acquisitionDate: row.acquisition_date,
  };
}

/**
 * SQLite-backed {@link AnnotationContextReader}. Read-only joins over the imaging
 * chain — no new table. Resolves one annotation's context, and the sibling
 * candidates a researcher can link it to (same animal, across sessions).
 */
export class SqliteAnnotationContextReader implements AnnotationContextReader {
  async getContext(annotationId: string): Promise<AnnotatedContext | null> {
    const db = await getDatabase();
    const rows = await db.select<ContextRow[]>(
      `${CONTEXT_SELECT} WHERE an.id = $1`,
      [annotationId],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async listSiblingCandidates(
    annotationId: string,
  ): Promise<AnnotatedContext[]> {
    const db = await getDatabase();
    const rows = await db.select<ContextRow[]>(
      `${CONTEXT_SELECT}
       WHERE a.id = (
         SELECT te2.animal_id
         FROM annotations an2
         JOIN stored_files sf2 ON sf2.id = an2.stored_file_id
         JOIN research_assets ra2 ON ra2.id = sf2.research_asset_id
         JOIN mri_sessions m2 ON ra2.owner_type = 'mri_session' AND m2.id = ra2.owner_id
         JOIN timeline_events te2 ON te2.id = m2.timeline_event_id
         WHERE an2.id = $1
       )
       AND an.id != $2
       ORDER BY m.acquisition_date ASC, an.created_at ASC`,
      [annotationId, annotationId],
    );
    return rows.map(mapRow);
  }
}
