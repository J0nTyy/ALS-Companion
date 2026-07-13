import type { BiomarkerResult } from "@/domain/entities/biomarker-result";
import type { BiomarkerResultRepository } from "@/application/ports/biomarker-result-repository";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import {
  mapRowToBiomarkerResult,
  type BiomarkerResultRow,
} from "./biomarker-result-row-mapper";

const COLUMNS =
  "id, biomarker_sample_id, biomarker_name, value, unit, method, notes, created_at";

const NOT_FOUND = "That biomarker result could not be found.";

/**
 * SQLite-backed {@link BiomarkerResultRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Listing is ordered oldest-first (entry order).
 * `update` inspects `rowsAffected` and throws {@link NotFoundError} when nothing
 * changed; `delete` is idempotent. Results have no `updated_at` column.
 */
export class SqliteBiomarkerResultRepository
  implements BiomarkerResultRepository
{
  async listBySample(biomarkerSampleId: string): Promise<BiomarkerResult[]> {
    const db = await getDatabase();
    const rows = await db.select<BiomarkerResultRow[]>(
      `SELECT ${COLUMNS} FROM biomarker_results
       WHERE biomarker_sample_id = $1
       ORDER BY created_at ASC`,
      [biomarkerSampleId],
    );
    return rows.map(mapRowToBiomarkerResult);
  }

  async getById(id: string): Promise<BiomarkerResult | null> {
    const db = await getDatabase();
    const rows = await db.select<BiomarkerResultRow[]>(
      `SELECT ${COLUMNS} FROM biomarker_results WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToBiomarkerResult(row) : null;
  }

  async create(result: BiomarkerResult): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO biomarker_results
         (id, biomarker_sample_id, biomarker_name, value, unit, method, notes,
          created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        result.id,
        result.biomarkerSampleId,
        result.biomarkerName,
        result.value,
        result.unit ?? null,
        result.method ?? null,
        result.notes ?? null,
        result.createdAt,
      ],
    );
  }

  async update(result: BiomarkerResult): Promise<void> {
    const db = await getDatabase();
    const updated = await db.execute(
      `UPDATE biomarker_results
         SET biomarker_name = $1, value = $2, unit = $3, method = $4, notes = $5
       WHERE id = $6`,
      [
        result.biomarkerName,
        result.value,
        result.unit ?? null,
        result.method ?? null,
        result.notes ?? null,
        result.id,
      ],
    );
    if (updated.rowsAffected === 0) {
      throw new NotFoundError(NOT_FOUND);
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM biomarker_results WHERE id = $1`, [id]);
  }
}
