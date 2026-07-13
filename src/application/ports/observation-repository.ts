import type { Observation } from "@/domain/entities/observation";

/**
 * Port: persistence for {@link Observation} entities.
 *
 * Implementations receive fully-formed entities (ids/timestamps generated in the
 * application layer). Repeated measurements of the same kind on the same day are
 * allowed and stored as separate rows — never merged or overwritten.
 *
 * **Contract for mutations of existing rows.** `update` MUST NOT report success
 * when no row matched the target id; it must detect "no rows changed" and throw
 * `NotFoundError`. `delete` was added in v1.4 (owner-authorized).
 */
export interface ObservationRepository {
  /** An animal's observations, most recent first (by observed date). */
  listByAnimal(animalId: string): Promise<Observation[]>;

  /** A single observation by id, or null if none exists. */
  getById(id: string): Promise<Observation | null>;

  /** Persist a brand-new observation. */
  create(observation: Observation): Promise<void>;

  /**
   * Persist changes to an existing observation.
   * @throws NotFoundError if no observation with `observation.id` exists.
   */
  update(observation: Observation): Promise<void>;

  /** Permanently delete an observation row (v1.4). Idempotent. */
  delete(id: string): Promise<void>;
}
