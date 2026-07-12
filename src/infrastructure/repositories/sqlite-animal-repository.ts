import type { Animal } from "@/domain/entities/animal";
import type { AnimalRepository } from "@/application/ports/animal-repository";
import type { AnimalSearchReader, SearchHit } from "@/application/ports/search";
import type { SearchQuery } from "@/domain/entities/search";
import { ConflictError, NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import { animalHit } from "@/application/use-cases/search/search-hit";
import { mapRowToAnimal, type AnimalRow } from "./animal-row-mapper";
import { SearchConditionBuilder, SEARCH_PER_TYPE_LIMIT } from "./search-sql";

const COLUMNS =
  "id, study_id, animal_identifier, sex, date_of_birth, mutation, treatment_group, created_at, updated_at";

const ANIMAL_NOT_FOUND = "That animal could not be found.";
const DUPLICATE_MESSAGE =
  "An animal with this ID already exists in this study.";

/**
 * Translate a thrown value for re-throwing. A SQLite UNIQUE-constraint violation
 * (duplicate `(study_id, animal_identifier)`) becomes a friendly `ConflictError`;
 * everything else — including our own `NotFoundError` — passes through unchanged.
 */
function toRepositoryError(error: unknown): Error {
  if (
    error instanceof Error &&
    /UNIQUE constraint failed/i.test(error.message)
  ) {
    return new ConflictError(DUPLICATE_MESSAGE, "animalIdentifier");
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * SQLite-backed {@link AnimalRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. There is no delete path. `update` checks the
 * execution result's `rowsAffected` and throws {@link NotFoundError} when nothing
 * was changed, and both writes translate a unique-constraint violation into a
 * {@link ConflictError} so a duplicate identifier can never masquerade as success.
 */
export class SqliteAnimalRepository
  implements AnimalRepository, AnimalSearchReader
{
  async searchAnimals(query: SearchQuery): Promise<SearchHit[]> {
    const f = query.filters;
    const c = new SearchConditionBuilder();
    c.text(
      ["a.animal_identifier", "a.mutation", "a.treatment_group"],
      query.text,
    );
    c.eq("a.study_id", f.studyId);
    c.eq("a.id", f.animalId);
    c.contains("a.mutation", f.mutation);
    c.contains("a.treatment_group", f.treatmentGroup);
    if (!c.hasUserConditions()) return [];

    const db = await getDatabase();
    const rows = await db.select<
      Array<{
        id: string;
        study_id: string;
        animal_identifier: string;
        mutation: string | null;
        treatment_group: string | null;
        study_name: string;
      }>
    >(
      `SELECT a.id, a.study_id, a.animal_identifier, a.mutation,
              a.treatment_group, s.name AS study_name
       FROM animals a
       JOIN studies s ON s.id = a.study_id
       ${c.whereSql()}
       ORDER BY a.updated_at DESC LIMIT ${SEARCH_PER_TYPE_LIMIT}`,
      c.params,
    );
    return rows.map((r) =>
      animalHit({
        id: r.id,
        studyId: r.study_id,
        identifier: r.animal_identifier,
        studyName: r.study_name,
        ...(r.mutation ? { mutation: r.mutation } : {}),
        ...(r.treatment_group ? { treatmentGroup: r.treatment_group } : {}),
      }),
    );
  }

  async listByStudy(studyId: string): Promise<Animal[]> {
    const db = await getDatabase();
    const rows = await db.select<AnimalRow[]>(
      `SELECT ${COLUMNS} FROM animals
       WHERE study_id = $1
       ORDER BY updated_at DESC, animal_identifier ASC`,
      [studyId],
    );
    return rows.map(mapRowToAnimal);
  }

  async getById(id: string): Promise<Animal | null> {
    const db = await getDatabase();
    const rows = await db.select<AnimalRow[]>(
      `SELECT ${COLUMNS} FROM animals WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToAnimal(row) : null;
  }

  async findByIdentifier(
    studyId: string,
    animalIdentifier: string,
  ): Promise<Animal | null> {
    const db = await getDatabase();
    const rows = await db.select<AnimalRow[]>(
      `SELECT ${COLUMNS} FROM animals
       WHERE study_id = $1 AND animal_identifier = $2`,
      [studyId, animalIdentifier],
    );
    const row = rows[0];
    return row ? mapRowToAnimal(row) : null;
  }

  async create(animal: Animal): Promise<void> {
    const db = await getDatabase();
    try {
      await db.execute(
        `INSERT INTO animals
           (id, study_id, animal_identifier, sex, date_of_birth, mutation,
            treatment_group, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          animal.id,
          animal.studyId,
          animal.animalIdentifier,
          animal.sex,
          animal.dateOfBirth ?? null,
          animal.mutation ?? null,
          animal.treatmentGroup ?? null,
          animal.createdAt,
          animal.updatedAt,
        ],
      );
    } catch (error) {
      throw toRepositoryError(error);
    }
  }

  async update(animal: Animal): Promise<void> {
    const db = await getDatabase();
    try {
      const result = await db.execute(
        `UPDATE animals
           SET animal_identifier = $1, sex = $2, date_of_birth = $3,
               mutation = $4, treatment_group = $5, updated_at = $6
         WHERE id = $7`,
        [
          animal.animalIdentifier,
          animal.sex,
          animal.dateOfBirth ?? null,
          animal.mutation ?? null,
          animal.treatmentGroup ?? null,
          animal.updatedAt,
          animal.id,
        ],
      );
      if (result.rowsAffected === 0) {
        throw new NotFoundError(ANIMAL_NOT_FOUND);
      }
    } catch (error) {
      throw toRepositoryError(error);
    }
  }
}
