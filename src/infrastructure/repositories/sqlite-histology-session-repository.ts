import type { HistologySession } from "@/domain/entities/histology-session";
import type { HistologySessionRepository } from "@/application/ports/histology-session-repository";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import {
  mapRowToHistologySession,
  type HistologySessionRow,
} from "./histology-session-row-mapper";

const COLUMNS =
  "id, timeline_event_id, stain, tissue, magnification, acquisition_date, operator, notes, created_at, updated_at";

const HISTOLOGY_SESSION_NOT_FOUND =
  "That histology session could not be found.";

/**
 * SQLite-backed {@link HistologySessionRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Listing is ordered most-recently-acquired
 * first. `update` inspects `rowsAffected` and throws {@link NotFoundError} when
 * nothing changed; `delete` is idempotent (the app-layer cascade removes children
 * first). Mirrors {@link SqliteMriSessionRepository}.
 */
export class SqliteHistologySessionRepository
  implements HistologySessionRepository
{
  async listByTimelineEvent(
    timelineEventId: string,
  ): Promise<HistologySession[]> {
    const db = await getDatabase();
    const rows = await db.select<HistologySessionRow[]>(
      `SELECT ${COLUMNS} FROM histology_sessions
       WHERE timeline_event_id = $1
       ORDER BY acquisition_date DESC, created_at DESC`,
      [timelineEventId],
    );
    return rows.map(mapRowToHistologySession);
  }

  async getById(id: string): Promise<HistologySession | null> {
    const db = await getDatabase();
    const rows = await db.select<HistologySessionRow[]>(
      `SELECT ${COLUMNS} FROM histology_sessions WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToHistologySession(row) : null;
  }

  async create(session: HistologySession): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO histology_sessions
         (id, timeline_event_id, stain, tissue, magnification,
          acquisition_date, operator, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        session.id,
        session.timelineEventId,
        session.stain,
        session.tissue ?? null,
        session.magnification ?? null,
        session.acquisitionDate,
        session.operator ?? null,
        session.notes ?? null,
        session.createdAt,
        session.updatedAt,
      ],
    );
  }

  async update(session: HistologySession): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE histology_sessions
         SET stain = $1, tissue = $2, magnification = $3,
             acquisition_date = $4, operator = $5, notes = $6, updated_at = $7
       WHERE id = $8`,
      [
        session.stain,
        session.tissue ?? null,
        session.magnification ?? null,
        session.acquisitionDate,
        session.operator ?? null,
        session.notes ?? null,
        session.updatedAt,
        session.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(HISTOLOGY_SESSION_NOT_FOUND);
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM histology_sessions WHERE id = $1`, [id]);
  }
}
