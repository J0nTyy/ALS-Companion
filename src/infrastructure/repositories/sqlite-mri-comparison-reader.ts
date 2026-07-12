import type {
  ComparableSession,
  MriComparisonReader,
} from "@/application/ports/mri-comparison-reader";
import { SUPPORTED_IMAGE_FORMATS } from "@/domain/entities/stored-file";
import { getDatabase } from "@/infrastructure/db/database";
import {
  collapseComparableSessions,
  type ComparableSessionRow,
} from "./mri-comparison-collapse";

/** Mime types the webview can render inline (single source of truth: the domain). */
const VIEWABLE_MIMES = SUPPORTED_IMAGE_FORMATS.filter(
  (f) => f.viewableInApp,
).map((f) => f.mime);

/**
 * SQLite-backed {@link MriComparisonReader}. A single joined read over the imaging
 * chain (mri_sessions → timeline_events → animals → studies, and research_assets →
 * stored_files), restricted to viewable image formats. No new table.
 */
export class SqliteMriComparisonReader implements MriComparisonReader {
  async listComparableSessions(): Promise<ComparableSession[]> {
    const db = await getDatabase();
    const placeholders = VIEWABLE_MIMES.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await db.select<ComparableSessionRow[]>(
      `SELECT m.id AS session_id, m.title AS session_title, m.modality,
              m.acquisition_date, m.anatomical_region, m.operator,
              s.id AS study_id, s.name AS study_name,
              a.id AS animal_id, a.animal_identifier,
              te.id AS timeline_event_id, te.title AS timeline_event_title,
              sf.id AS file_id, sf.relative_path, sf.original_name,
              sf.mime_type, sf.created_at AS file_created_at
       FROM mri_sessions m
       JOIN timeline_events te ON te.id = m.timeline_event_id
       JOIN animals a ON a.id = te.animal_id
       JOIN studies s ON s.id = a.study_id
       JOIN research_assets ra
         ON ra.owner_type = 'mri_session' AND ra.owner_id = m.id
       JOIN stored_files sf ON sf.research_asset_id = ra.id
       WHERE sf.mime_type IN (${placeholders})`,
      VIEWABLE_MIMES,
    );
    return collapseComparableSessions(rows);
  }
}
