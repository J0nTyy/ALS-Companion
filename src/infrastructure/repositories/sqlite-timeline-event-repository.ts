import type {
  TimelineEvent,
  TimelineEventCategory,
  TimelineEventStatus,
} from "@/domain/entities/timeline-event";
import type { TimelineEventRepository } from "@/application/ports/timeline-event-repository";
import type {
  SearchHit,
  TimelineEventSearchReader,
} from "@/application/ports/search";
import type { SearchQuery } from "@/domain/entities/search";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import { timelineEventHit } from "@/application/use-cases/search/search-hit";
import {
  mapRowToTimelineEvent,
  type TimelineEventRow,
} from "./timeline-event-row-mapper";
import { SearchConditionBuilder, SEARCH_PER_TYPE_LIMIT } from "./search-sql";

const COLUMNS =
  "id, animal_id, title, category, status, planned_date, completed_date, notes, created_at, updated_at";

const TIMELINE_EVENT_NOT_FOUND = "That timeline event could not be found.";

/**
 * SQLite-backed {@link TimelineEventRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Listing is ordered most-recent-activity
 * first: by the event's relevant date (planned, else completed) descending —
 * which floats upcoming planned steps to the top — then by creation time. There
 * is no delete path. `update` inspects `rowsAffected` and throws
 * {@link NotFoundError} when nothing changed.
 */
export class SqliteTimelineEventRepository
  implements TimelineEventRepository, TimelineEventSearchReader
{
  async searchTimelineEvents(query: SearchQuery): Promise<SearchHit[]> {
    const f = query.filters;
    const relevantDate = "COALESCE(te.planned_date, te.completed_date)";
    const c = new SearchConditionBuilder();
    c.text(["te.title", "te.notes"], query.text);
    c.eq("a.study_id", f.studyId);
    c.eq("te.animal_id", f.animalId);
    c.eq("te.category", f.timelineCategory);
    c.eq("te.status", f.status);
    c.gte(relevantDate, f.dateFrom);
    c.lte(relevantDate, f.dateTo);
    if (!c.hasUserConditions()) return [];

    const db = await getDatabase();
    const rows = await db.select<
      Array<{
        id: string;
        title: string;
        category: string;
        status: string;
        animal_id: string;
        study_id: string;
        animal_identifier: string;
      }>
    >(
      `SELECT te.id, te.title, te.category, te.status, te.animal_id,
              a.study_id, a.animal_identifier
       FROM timeline_events te
       JOIN animals a ON a.id = te.animal_id
       ${c.whereSql()}
       ORDER BY ${relevantDate} DESC, te.created_at DESC
       LIMIT ${SEARCH_PER_TYPE_LIMIT}`,
      c.params,
    );
    return rows.map((r) =>
      timelineEventHit({
        id: r.id,
        studyId: r.study_id,
        animalId: r.animal_id,
        title: r.title,
        category: r.category as TimelineEventCategory,
        status: r.status as TimelineEventStatus,
        animalIdentifier: r.animal_identifier,
      }),
    );
  }

  async listByAnimal(animalId: string): Promise<TimelineEvent[]> {
    const db = await getDatabase();
    const rows = await db.select<TimelineEventRow[]>(
      `SELECT ${COLUMNS} FROM timeline_events
       WHERE animal_id = $1
       ORDER BY COALESCE(planned_date, completed_date) DESC, created_at DESC`,
      [animalId],
    );
    return rows.map(mapRowToTimelineEvent);
  }

  async getById(id: string): Promise<TimelineEvent | null> {
    const db = await getDatabase();
    const rows = await db.select<TimelineEventRow[]>(
      `SELECT ${COLUMNS} FROM timeline_events WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToTimelineEvent(row) : null;
  }

  async create(event: TimelineEvent): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO timeline_events
         (id, animal_id, title, category, status, planned_date, completed_date,
          notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.id,
        event.animalId,
        event.title,
        event.category,
        event.status,
        event.plannedDate ?? null,
        event.completedDate ?? null,
        event.notes ?? null,
        event.createdAt,
        event.updatedAt,
      ],
    );
  }

  async update(event: TimelineEvent): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE timeline_events
         SET title = $1, category = $2, status = $3, planned_date = $4,
             completed_date = $5, notes = $6, updated_at = $7
       WHERE id = $8`,
      [
        event.title,
        event.category,
        event.status,
        event.plannedDate ?? null,
        event.completedDate ?? null,
        event.notes ?? null,
        event.updatedAt,
        event.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(TIMELINE_EVENT_NOT_FOUND);
    }
  }
}
