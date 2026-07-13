import {
  isBiomarkerSampleType,
  type BiomarkerSample,
} from "@/domain/entities/biomarker-sample";
import { isValidDateOnly } from "@/domain/value-objects/date-only";

/**
 * A row as returned by SQLite for the `biomarker_samples` table. Columns are
 * snake_case; `operator` and `notes` may be NULL. No Tauri import, so the mapping
 * logic is unit-testable in a plain Node env.
 */
export interface BiomarkerSampleRow {
  id: string;
  timeline_event_id: string;
  sample_type: string;
  collection_date: string;
  operator: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link BiomarkerSample}, failing loudly on corrupt
 * data: an unrecognized sample type or a malformed/impossible collection date.
 */
export function mapRowToBiomarkerSample(
  row: BiomarkerSampleRow,
): BiomarkerSample {
  if (!isBiomarkerSampleType(row.sample_type)) {
    throw new Error(
      `Biomarker sample ${row.id} has an unrecognized sample type: ${String(row.sample_type)}`,
    );
  }

  const collectionDate = row.collection_date?.trim() ?? "";
  if (!isValidDateOnly(collectionDate)) {
    throw new Error(
      `Biomarker sample ${row.id} has an invalid collection date: ${String(row.collection_date)}`,
    );
  }

  const operator = row.operator?.trim() ?? "";
  const notes = row.notes?.trim() ?? "";

  return {
    id: row.id,
    timelineEventId: row.timeline_event_id,
    sampleType: row.sample_type,
    collectionDate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(operator.length > 0 ? { operator } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
