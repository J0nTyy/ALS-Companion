import {
  isHistologyStain,
  type HistologySession,
} from "@/domain/entities/histology-session";
import { isValidDateOnly } from "@/domain/value-objects/date-only";

/**
 * A row as returned by SQLite for the `histology_sessions` table. Columns are
 * snake_case; `tissue`, `magnification`, `operator`, and `notes` may be NULL.
 *
 * No Tauri import, so the mapping logic is unit-testable in a plain Node env.
 */
export interface HistologySessionRow {
  id: string;
  timeline_event_id: string;
  stain: string;
  tissue: string | null;
  magnification: string | null;
  acquisition_date: string;
  operator: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link HistologySession}, failing loudly on
 * corrupt data: an unrecognized stain or a malformed/impossible acquisition date.
 */
export function mapRowToHistologySession(
  row: HistologySessionRow,
): HistologySession {
  if (!isHistologyStain(row.stain)) {
    throw new Error(
      `Histology session ${row.id} has an unrecognized stain: ${String(row.stain)}`,
    );
  }

  const acquisitionDate = row.acquisition_date?.trim() ?? "";
  if (!isValidDateOnly(acquisitionDate)) {
    throw new Error(
      `Histology session ${row.id} has an invalid acquisition date: ${String(row.acquisition_date)}`,
    );
  }

  const tissue = row.tissue?.trim() ?? "";
  const magnification = row.magnification?.trim() ?? "";
  const operator = row.operator?.trim() ?? "";
  const notes = row.notes?.trim() ?? "";

  return {
    id: row.id,
    timelineEventId: row.timeline_event_id,
    stain: row.stain,
    acquisitionDate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(tissue.length > 0 ? { tissue } : {}),
    ...(magnification.length > 0 ? { magnification } : {}),
    ...(operator.length > 0 ? { operator } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
