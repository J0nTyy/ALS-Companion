import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";
import type { BiomarkerSampleRepository } from "@/application/ports/biomarker-sample-repository";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import {
  mapRowToBiomarkerSample,
  type BiomarkerSampleRow,
} from "./biomarker-sample-row-mapper";

const COLUMNS =
  "id, timeline_event_id, sample_type, collection_date, operator, notes, created_at, updated_at";

const NOT_FOUND = "That biomarker sample could not be found.";

/**
 * SQLite-backed {@link BiomarkerSampleRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Listing is ordered most-recently-collected
 * first. `update` inspects `rowsAffected` and throws {@link NotFoundError} when
 * nothing changed; `delete` is idempotent (results are removed first in the app
 * layer).
 */
export class SqliteBiomarkerSampleRepository
  implements BiomarkerSampleRepository
{
  async listByTimelineEvent(
    timelineEventId: string,
  ): Promise<BiomarkerSample[]> {
    const db = await getDatabase();
    const rows = await db.select<BiomarkerSampleRow[]>(
      `SELECT ${COLUMNS} FROM biomarker_samples
       WHERE timeline_event_id = $1
       ORDER BY collection_date DESC, created_at DESC`,
      [timelineEventId],
    );
    return rows.map(mapRowToBiomarkerSample);
  }

  async getById(id: string): Promise<BiomarkerSample | null> {
    const db = await getDatabase();
    const rows = await db.select<BiomarkerSampleRow[]>(
      `SELECT ${COLUMNS} FROM biomarker_samples WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToBiomarkerSample(row) : null;
  }

  async create(sample: BiomarkerSample): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO biomarker_samples
         (id, timeline_event_id, sample_type, collection_date, operator, notes,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sample.id,
        sample.timelineEventId,
        sample.sampleType,
        sample.collectionDate,
        sample.operator ?? null,
        sample.notes ?? null,
        sample.createdAt,
        sample.updatedAt,
      ],
    );
  }

  async update(sample: BiomarkerSample): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE biomarker_samples
         SET sample_type = $1, collection_date = $2, operator = $3,
             notes = $4, updated_at = $5
       WHERE id = $6`,
      [
        sample.sampleType,
        sample.collectionDate,
        sample.operator ?? null,
        sample.notes ?? null,
        sample.updatedAt,
        sample.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(NOT_FOUND);
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM biomarker_samples WHERE id = $1`, [id]);
  }
}
