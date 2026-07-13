import type { MRISession, MriModality } from "@/domain/entities/mri-session";
import type { MRISessionRepository } from "@/application/ports/mri-session-repository";
import type {
  MriSessionSearchReader,
  SearchHit,
} from "@/application/ports/search";
import type { SearchQuery } from "@/domain/entities/search";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import { mriSessionHit } from "@/application/use-cases/search/search-hit";
import {
  mapRowToMriSession,
  type MriSessionRow,
} from "./mri-session-row-mapper";
import { SearchConditionBuilder, SEARCH_PER_TYPE_LIMIT } from "./search-sql";

const COLUMNS =
  "id, timeline_event_id, title, modality, anatomical_region, acquisition_date, operator, notes, created_at, updated_at";

const MRI_SESSION_NOT_FOUND = "That MRI session could not be found.";

/**
 * SQLite-backed {@link MRISessionRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Listing is ordered most-recently-acquired
 * first. There is no delete path. `update` inspects `rowsAffected` and throws
 * {@link NotFoundError} when nothing changed.
 */
export class SqliteMriSessionRepository
  implements MRISessionRepository, MriSessionSearchReader
{
  async searchMriSessions(query: SearchQuery): Promise<SearchHit[]> {
    const f = query.filters;
    const c = new SearchConditionBuilder();
    c.text(
      ["m.title", "m.anatomical_region", "m.operator", "m.notes"],
      query.text,
    );
    c.eq("a.study_id", f.studyId);
    c.eq("te.animal_id", f.animalId);
    c.eq("m.modality", f.mriModality);
    c.gte("m.acquisition_date", f.dateFrom);
    c.lte("m.acquisition_date", f.dateTo);
    if (!c.hasUserConditions()) return [];

    const db = await getDatabase();
    const rows = await db.select<
      Array<{
        id: string;
        title: string;
        modality: string;
        animal_id: string;
        study_id: string;
        animal_identifier: string;
      }>
    >(
      `SELECT m.id, m.title, m.modality, te.animal_id AS animal_id,
              a.study_id, a.animal_identifier
       FROM mri_sessions m
       JOIN timeline_events te ON te.id = m.timeline_event_id
       JOIN animals a ON a.id = te.animal_id
       ${c.whereSql()}
       ORDER BY m.acquisition_date DESC, m.created_at DESC
       LIMIT ${SEARCH_PER_TYPE_LIMIT}`,
      c.params,
    );
    return rows.map((r) =>
      mriSessionHit({
        id: r.id,
        studyId: r.study_id,
        animalId: r.animal_id,
        title: r.title,
        modality: r.modality as MriModality,
        animalIdentifier: r.animal_identifier,
      }),
    );
  }

  async listByTimelineEvent(timelineEventId: string): Promise<MRISession[]> {
    const db = await getDatabase();
    const rows = await db.select<MriSessionRow[]>(
      `SELECT ${COLUMNS} FROM mri_sessions
       WHERE timeline_event_id = $1
       ORDER BY acquisition_date DESC, created_at DESC`,
      [timelineEventId],
    );
    return rows.map(mapRowToMriSession);
  }

  async getById(id: string): Promise<MRISession | null> {
    const db = await getDatabase();
    const rows = await db.select<MriSessionRow[]>(
      `SELECT ${COLUMNS} FROM mri_sessions WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToMriSession(row) : null;
  }

  async create(session: MRISession): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO mri_sessions
         (id, timeline_event_id, title, modality, anatomical_region,
          acquisition_date, operator, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        session.id,
        session.timelineEventId,
        session.title,
        session.modality,
        session.anatomicalRegion ?? null,
        session.acquisitionDate,
        session.operator ?? null,
        session.notes ?? null,
        session.createdAt,
        session.updatedAt,
      ],
    );
  }

  async update(session: MRISession): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE mri_sessions
         SET title = $1, modality = $2, anatomical_region = $3,
             acquisition_date = $4, operator = $5, notes = $6, updated_at = $7
       WHERE id = $8`,
      [
        session.title,
        session.modality,
        session.anatomicalRegion ?? null,
        session.acquisitionDate,
        session.operator ?? null,
        session.notes ?? null,
        session.updatedAt,
        session.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(MRI_SESSION_NOT_FOUND);
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM mri_sessions WHERE id = $1`, [id]);
  }
}
