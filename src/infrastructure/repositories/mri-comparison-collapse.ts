import type { ComparableSession } from "@/application/ports/mri-comparison-reader";

/**
 * Pure mapping/collapse for the MRI comparison read model — no database import, so
 * it is unit-testable in plain Node. One joined SQL row is a session paired with
 * one of its viewable stored files.
 */
export interface ComparableSessionRow {
  session_id: string;
  session_title: string;
  modality: string;
  acquisition_date: string;
  anatomical_region: string | null;
  operator: string | null;
  study_id: string;
  study_name: string;
  animal_id: string;
  animal_identifier: string;
  timeline_event_id: string;
  timeline_event_title: string;
  file_id: string;
  relative_path: string;
  original_name: string;
  mime_type: string;
  file_created_at: string;
}

function toComparableSession(row: ComparableSessionRow): ComparableSession {
  const region = row.anatomical_region?.trim() ?? "";
  const operator = row.operator?.trim() ?? "";
  return {
    sessionId: row.session_id,
    title: row.session_title,
    modality: row.modality,
    acquisitionDate: row.acquisition_date,
    studyId: row.study_id,
    studyName: row.study_name,
    animalId: row.animal_id,
    animalIdentifier: row.animal_identifier,
    timelineEventId: row.timeline_event_id,
    timelineEventTitle: row.timeline_event_title,
    image: {
      storedFileId: row.file_id,
      relativePath: row.relative_path,
      originalName: row.original_name,
      mimeType: row.mime_type,
    },
    ...(region.length > 0 ? { region } : {}),
    ...(operator.length > 0 ? { operator } : {}),
  };
}

/**
 * Collapse joined rows to one {@link ComparableSession} per session — keeping that
 * session's MOST RECENT viewable file — then sort newest-acquired first.
 * Order-independent (picks the max `file_created_at`), so it does not rely on SQL
 * ordering.
 */
export function collapseComparableSessions(
  rows: ComparableSessionRow[],
): ComparableSession[] {
  const latestBySession = new Map<string, ComparableSessionRow>();
  for (const row of rows) {
    const existing = latestBySession.get(row.session_id);
    if (
      !existing ||
      row.file_created_at.localeCompare(existing.file_created_at) > 0
    ) {
      latestBySession.set(row.session_id, row);
    }
  }
  return [...latestBySession.values()]
    .map(toComparableSession)
    .sort(
      (a, b) =>
        b.acquisitionDate.localeCompare(a.acquisitionDate) ||
        a.title.localeCompare(b.title) ||
        a.sessionId.localeCompare(b.sessionId),
    );
}
