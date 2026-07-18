import type { Study, StudyStatus } from "@/domain/entities/study";
import type {
  StudyListOptions,
  StudyRepository,
} from "@/application/ports/study-repository";
import type { SearchHit, StudySearchReader } from "@/application/ports/search";
import type { SearchQuery } from "@/domain/entities/search";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import { studyHit } from "@/application/use-cases/search/search-hit";
import { mapRowToStudy, type StudyRow } from "./study-row-mapper";
import { SearchConditionBuilder, SEARCH_PER_TYPE_LIMIT } from "./search-sql";

const COLUMNS =
  "id, name, description, summary, summary_updated_at, strain, status, created_at, updated_at";

const STUDY_NOT_FOUND = "That study could not be found.";

/**
 * SQLite-backed {@link StudyRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Reads sort active studies by most-recently
 * updated; when archived studies are included they follow the active ones.
 * Archiving is an UPDATE — rows are never deleted.
 *
 * Per the port contract, `update` and `archive` inspect the execution result's
 * `rowsAffected` and throw {@link NotFoundError} when nothing was changed, so a
 * missing target can never masquerade as a successful save.
 */
export class SqliteStudyRepository
  implements StudyRepository, StudySearchReader
{
  async searchStudies(query: SearchQuery): Promise<SearchHit[]> {
    const c = new SearchConditionBuilder();
    c.text(["name", "description", "strain"], query.text);
    c.eq("id", query.filters.studyId);
    c.eq("status", query.filters.status);
    if (!c.hasUserConditions()) return [];

    const db = await getDatabase();
    const rows = await db.select<
      Array<{ id: string; name: string; strain: string; status: string }>
    >(
      `SELECT id, name, strain, status FROM studies
       ${c.whereSql()}
       ORDER BY updated_at DESC LIMIT ${SEARCH_PER_TYPE_LIMIT}`,
      c.params,
    );
    return rows.map((r) =>
      studyHit({
        id: r.id,
        name: r.name,
        strain: r.strain,
        status: r.status as StudyStatus,
      }),
    );
  }

  async list(options?: StudyListOptions): Promise<Study[]> {
    const db = await getDatabase();

    const rows = options?.includeArchived
      ? await db.select<StudyRow[]>(
          `SELECT ${COLUMNS} FROM studies
           ORDER BY (status = 'archived') ASC, updated_at DESC, name ASC`,
        )
      : await db.select<StudyRow[]>(
          `SELECT ${COLUMNS} FROM studies
           WHERE status != 'archived'
           ORDER BY updated_at DESC, name ASC`,
        );

    return rows.map(mapRowToStudy);
  }

  async getById(id: string): Promise<Study | null> {
    const db = await getDatabase();
    const rows = await db.select<StudyRow[]>(
      `SELECT ${COLUMNS} FROM studies WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToStudy(row) : null;
  }

  async create(study: Study): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO studies
         (id, name, description, summary, summary_updated_at, strain, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        study.id,
        study.name,
        study.description ?? null,
        study.summary ?? null,
        study.summaryUpdatedAt ?? null,
        study.strain,
        study.status,
        study.createdAt,
        study.updatedAt,
      ],
    );
  }

  async update(study: Study): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE studies
         SET name = $1, description = $2, summary = $3, summary_updated_at = $4,
             strain = $5, status = $6, updated_at = $7
       WHERE id = $8`,
      [
        study.name,
        study.description ?? null,
        study.summary ?? null,
        study.summaryUpdatedAt ?? null,
        study.strain,
        study.status,
        study.updatedAt,
        study.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(STUDY_NOT_FOUND);
    }
  }

  async archive(id: string, updatedAt: string): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE studies SET status = 'archived', updated_at = $1 WHERE id = $2`,
      [updatedAt, id],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(STUDY_NOT_FOUND);
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM studies WHERE id = $1`, [id]);
  }
}
