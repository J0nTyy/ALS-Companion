import type { Animal } from "@/domain/entities/animal";

/**
 * Narrow read-only view of animals. Depended on by the observation use cases to
 * verify a parent animal exists (and belongs to the expected study) — without
 * granting them the full write surface of {@link AnimalRepository}.
 */
export interface AnimalReader {
  getById(id: string): Promise<Animal | null>;
}

/**
 * Port: persistence for {@link Animal} entities.
 *
 * The application layer depends on this interface only; a concrete SQLite
 * adapter lives in `infrastructure`. Implementations receive fully-formed
 * entities — ids and timestamps are generated in the application layer.
 *
 * **Contract for mutations of existing rows.** `update` MUST NOT report success
 * when no row matched the target id; it must detect "no rows changed" and throw
 * `NotFoundError` (from `@/application/errors`). Implementations must also refuse
 * a duplicate `(studyId, animalIdentifier)` by throwing `ConflictError`.
 *
 * There is intentionally **no delete** operation — animal records are never
 * removed.
 */
export interface AnimalRepository extends AnimalReader {
  /** Animals in a study, newest-updated first. */
  listByStudy(studyId: string): Promise<Animal[]>;

  /** A single animal by id, or null if none exists. */
  getById(id: string): Promise<Animal | null>;

  /**
   * The animal in `studyId` with the given identifier, or null. Used to detect
   * duplicates with a friendly message before hitting the unique constraint.
   */
  findByIdentifier(
    studyId: string,
    animalIdentifier: string,
  ): Promise<Animal | null>;

  /**
   * Persist a brand-new animal.
   * @throws ConflictError if the `(studyId, animalIdentifier)` already exists.
   */
  create(animal: Animal): Promise<void>;

  /**
   * Persist changes to an existing animal.
   * @throws NotFoundError if no animal with `animal.id` exists.
   * @throws ConflictError if the new identifier collides within the study.
   */
  update(animal: Animal): Promise<void>;
}
