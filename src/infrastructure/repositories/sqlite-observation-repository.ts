import type {
  Observation,
  ObservationKind,
} from "@/domain/entities/observation";
import type { ObservationRepository } from "@/application/ports/observation-repository";
import type {
  ObservationSearchReader,
  SearchHit,
} from "@/application/ports/search";
import type { SearchQuery } from "@/domain/entities/search";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import { observationHit } from "@/application/use-cases/search/search-hit";
import {
  mapRowToObservation,
  type ObservationRow,
} from "./observation-row-mapper";
import { SearchConditionBuilder, SEARCH_PER_TYPE_LIMIT } from "./search-sql";

const COLUMNS =
  "id, animal_id, observed_on, kind, value, scale_name, notes, created_at, updated_at";

const OBSERVATION_NOT_FOUND = "That observation could not be found.";

/**
 * SQLite-backed {@link ObservationRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Listing is ordered most-recent-first by
 * observed date. There is no delete path. `update` inspects `rowsAffected` and
 * throws {@link NotFoundError} when nothing changed, so a missing target can
 * never masquerade as a successful save.
 */
export class SqliteObservationRepository
  implements ObservationRepository, ObservationSearchReader
{
  async searchObservations(query: SearchQuery): Promise<SearchHit[]> {
    const f = query.filters;
    const c = new SearchConditionBuilder();
    c.text(["o.notes", "o.scale_name"], query.text);
    c.eq("a.study_id", f.studyId);
    c.eq("o.animal_id", f.animalId);
    c.eq("o.kind", f.observationType);
    c.gte("o.observed_on", f.dateFrom);
    c.lte("o.observed_on", f.dateTo);
    if (!c.hasUserConditions()) return [];

    const db = await getDatabase();
    const rows = await db.select<
      Array<{
        id: string;
        animal_id: string;
        kind: string;
        observed_on: string;
        study_id: string;
        animal_identifier: string;
      }>
    >(
      `SELECT o.id, o.animal_id, o.kind, o.observed_on,
              a.study_id, a.animal_identifier
       FROM observations o
       JOIN animals a ON a.id = o.animal_id
       ${c.whereSql()}
       ORDER BY o.observed_on DESC, o.created_at DESC
       LIMIT ${SEARCH_PER_TYPE_LIMIT}`,
      c.params,
    );
    return rows.map((r) =>
      observationHit({
        id: r.id,
        studyId: r.study_id,
        animalId: r.animal_id,
        kind: r.kind as ObservationKind,
        observedOn: r.observed_on,
        animalIdentifier: r.animal_identifier,
      }),
    );
  }

  async listByAnimal(animalId: string): Promise<Observation[]> {
    const db = await getDatabase();
    const rows = await db.select<ObservationRow[]>(
      `SELECT ${COLUMNS} FROM observations
       WHERE animal_id = $1
       ORDER BY observed_on DESC, created_at DESC`,
      [animalId],
    );
    return rows.map(mapRowToObservation);
  }

  async getById(id: string): Promise<Observation | null> {
    const db = await getDatabase();
    const rows = await db.select<ObservationRow[]>(
      `SELECT ${COLUMNS} FROM observations WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToObservation(row) : null;
  }

  async create(observation: Observation): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO observations
         (id, animal_id, observed_on, kind, value, scale_name, notes,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        observation.id,
        observation.animalId,
        observation.observedOn,
        observation.kind,
        observation.value,
        observation.scaleName ?? null,
        observation.notes ?? null,
        observation.createdAt,
        observation.updatedAt,
      ],
    );
  }

  async update(observation: Observation): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE observations
         SET observed_on = $1, kind = $2, value = $3, scale_name = $4,
             notes = $5, updated_at = $6
       WHERE id = $7`,
      [
        observation.observedOn,
        observation.kind,
        observation.value,
        observation.scaleName ?? null,
        observation.notes ?? null,
        observation.updatedAt,
        observation.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(OBSERVATION_NOT_FOUND);
    }
  }
}
