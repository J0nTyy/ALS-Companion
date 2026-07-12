import type { TimelineEvent } from "@/domain/entities/timeline-event";

/**
 * Narrow read-only view of timeline events. Depended on by the MRI-session use
 * cases to verify the parent event exists (and, via its animal, that the study is
 * not archived) — without granting them the full write surface.
 */
export interface TimelineEventReader {
  getById(id: string): Promise<TimelineEvent | null>;
}

/**
 * Port: persistence for {@link TimelineEvent} entities.
 *
 * Implementations receive fully-formed entities (ids/timestamps generated in the
 * application layer). Timeline history is permanent — there is intentionally
 * **no delete** operation.
 *
 * **Contract for mutations of existing rows.** `update` MUST NOT report success
 * when no row matched the target id; it must detect "no rows changed" and throw
 * `NotFoundError`.
 */
export interface TimelineEventRepository extends TimelineEventReader {
  /** An animal's timeline events, most-recent activity first. */
  listByAnimal(animalId: string): Promise<TimelineEvent[]>;

  /** A single event by id, or null if none exists. */
  getById(id: string): Promise<TimelineEvent | null>;

  /** Persist a brand-new event. */
  create(event: TimelineEvent): Promise<void>;

  /**
   * Persist changes to an existing event.
   * @throws NotFoundError if no event with `event.id` exists.
   */
  update(event: TimelineEvent): Promise<void>;
}
