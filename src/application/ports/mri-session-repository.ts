import type { MRISession } from "@/domain/entities/mri-session";

/**
 * Narrow read-only view of MRI sessions. Depended on by the research-asset use
 * cases to resolve an "mri_session" owner (and, via its timeline event/animal,
 * that the study is not archived).
 */
export interface MRISessionReader {
  getById(id: string): Promise<MRISession | null>;
}

/**
 * Port: persistence for {@link MRISession} entities.
 *
 * Implementations receive fully-formed entities (ids/timestamps generated in the
 * application layer). Sessions are research records — there is intentionally
 * **no delete** operation.
 *
 * **Contract for mutations of existing rows.** `update` MUST NOT report success
 * when no row matched the target id; it must detect "no rows changed" and throw
 * `NotFoundError`.
 */
export interface MRISessionRepository extends MRISessionReader {
  /** Sessions for a timeline event, most-recently acquired first. */
  listByTimelineEvent(timelineEventId: string): Promise<MRISession[]>;

  /** A single session by id, or null if none exists. */
  getById(id: string): Promise<MRISession | null>;

  /** Persist a brand-new session. */
  create(session: MRISession): Promise<void>;

  /**
   * Persist changes to an existing session.
   * @throws NotFoundError if no session with `session.id` exists.
   */
  update(session: MRISession): Promise<void>;
}
