import {
  isTimelineEventCategory,
  isTimelineEventStatus,
  type TimelineEvent,
} from "@/domain/entities/timeline-event";
import { isValidDateOnly } from "@/domain/value-objects/date-only";

/**
 * A row as returned by SQLite for the `timeline_events` table. Columns are
 * snake_case; `planned_date`, `completed_date`, and `notes` may be NULL.
 *
 * No Tauri import, so the mapping logic is unit-testable in a plain Node env.
 */
export interface TimelineEventRow {
  id: string;
  animal_id: string;
  title: string;
  category: string;
  status: string;
  planned_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link TimelineEvent}, failing loudly on corrupt
 * data: an empty title, an unrecognized category or status, or a non-empty but
 * malformed/impossible planned/completed date.
 */
export function mapRowToTimelineEvent(row: TimelineEventRow): TimelineEvent {
  const title = row.title?.trim() ?? "";
  if (title.length === 0) {
    throw new Error(`Timeline event ${row.id} has an empty title`);
  }

  if (!isTimelineEventCategory(row.category)) {
    throw new Error(
      `Timeline event ${row.id} has an unrecognized category: ${String(row.category)}`,
    );
  }

  if (!isTimelineEventStatus(row.status)) {
    throw new Error(
      `Timeline event ${row.id} has an unrecognized status: ${String(row.status)}`,
    );
  }

  const plannedDate = row.planned_date?.trim() ?? "";
  if (plannedDate.length > 0 && !isValidDateOnly(plannedDate)) {
    throw new Error(
      `Timeline event ${row.id} has an invalid planned date: ${String(row.planned_date)}`,
    );
  }

  const completedDate = row.completed_date?.trim() ?? "";
  if (completedDate.length > 0 && !isValidDateOnly(completedDate)) {
    throw new Error(
      `Timeline event ${row.id} has an invalid completed date: ${String(row.completed_date)}`,
    );
  }

  const notes = row.notes?.trim() ?? "";

  return {
    id: row.id,
    animalId: row.animal_id,
    title,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(plannedDate.length > 0 ? { plannedDate } : {}),
    ...(completedDate.length > 0 ? { completedDate } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
