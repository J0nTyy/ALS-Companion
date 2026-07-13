import type { BiomarkerResult } from "@/domain/entities/biomarker-result";

/**
 * A row as returned by SQLite for the `biomarker_results` table. Columns are
 * snake_case; `unit`, `method`, and `notes` may be NULL. Results carry only a
 * creation timestamp (no `updated_at`). No Tauri import, so the mapping logic is
 * unit-testable in a plain Node env.
 */
export interface BiomarkerResultRow {
  id: string;
  biomarker_sample_id: string;
  biomarker_name: string;
  value: string;
  unit: string | null;
  method: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Map a database row to a domain {@link BiomarkerResult}, failing loudly on corrupt
 * data: an empty biomarker name or an empty value.
 */
export function mapRowToBiomarkerResult(
  row: BiomarkerResultRow,
): BiomarkerResult {
  const biomarkerName = row.biomarker_name?.trim() ?? "";
  if (biomarkerName.length === 0) {
    throw new Error(`Biomarker result ${row.id} has an empty biomarker name`);
  }

  const value = row.value?.trim() ?? "";
  if (value.length === 0) {
    throw new Error(`Biomarker result ${row.id} has an empty value`);
  }

  const unit = row.unit?.trim() ?? "";
  const method = row.method?.trim() ?? "";
  const notes = row.notes?.trim() ?? "";

  return {
    id: row.id,
    biomarkerSampleId: row.biomarker_sample_id,
    biomarkerName,
    value,
    createdAt: row.created_at,
    ...(unit.length > 0 ? { unit } : {}),
    ...(method.length > 0 ? { method } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
