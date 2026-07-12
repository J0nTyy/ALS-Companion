import {
  isMriModality,
  type MRISession,
} from "@/domain/entities/mri-session";
import { isValidDateOnly } from "@/domain/value-objects/date-only";

/**
 * A row as returned by SQLite for the `mri_sessions` table. Columns are
 * snake_case; `anatomical_region`, `operator`, and `notes` may be NULL.
 *
 * No Tauri import, so the mapping logic is unit-testable in a plain Node env.
 */
export interface MriSessionRow {
  id: string;
  timeline_event_id: string;
  title: string;
  modality: string;
  anatomical_region: string | null;
  acquisition_date: string;
  operator: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link MRISession}, failing loudly on corrupt
 * data: an empty title, an unrecognized modality, or a malformed/impossible
 * acquisition date.
 */
export function mapRowToMriSession(row: MriSessionRow): MRISession {
  const title = row.title?.trim() ?? "";
  if (title.length === 0) {
    throw new Error(`MRI session ${row.id} has an empty title`);
  }
  if (!isMriModality(row.modality)) {
    throw new Error(
      `MRI session ${row.id} has an unrecognized modality: ${String(row.modality)}`,
    );
  }

  const acquisitionDate = row.acquisition_date?.trim() ?? "";
  if (!isValidDateOnly(acquisitionDate)) {
    throw new Error(
      `MRI session ${row.id} has an invalid acquisition date: ${String(row.acquisition_date)}`,
    );
  }

  const anatomicalRegion = row.anatomical_region?.trim() ?? "";
  const operator = row.operator?.trim() ?? "";
  const notes = row.notes?.trim() ?? "";

  return {
    id: row.id,
    timelineEventId: row.timeline_event_id,
    title,
    modality: row.modality,
    acquisitionDate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(anatomicalRegion.length > 0 ? { anatomicalRegion } : {}),
    ...(operator.length > 0 ? { operator } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
