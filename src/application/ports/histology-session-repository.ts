import type { HistologySession } from "@/domain/entities/histology-session";

/**
 * Narrow read-only view of histology sessions. Depended on by the research-asset /
 * storage / annotation use cases to resolve a "histology_session" owner (and, via
 * its timeline event/animal, that the study is not archived) — mirroring
 * {@link MRISessionReader}.
 */
export interface HistologySessionReader {
  getById(id: string): Promise<HistologySession | null>;
}

/**
 * Port: persistence for {@link HistologySession} entities.
 *
 * Implementations receive fully-formed entities (ids/timestamps generated in the
 * application layer). Deleting a session cascades (assets → files → annotations) in
 * the application layer via the DeletionService — the same rule as MRI sessions.
 *
 * **Contract for mutations of existing rows.** `update` MUST NOT report success
 * when no row matched the target id; it must detect "no rows changed" and throw
 * `NotFoundError`.
 */
export interface HistologySessionRepository extends HistologySessionReader {
  /** Sessions for a timeline event, most-recently acquired first. */
  listByTimelineEvent(timelineEventId: string): Promise<HistologySession[]>;

  /** A single session by id, or null if none exists. */
  getById(id: string): Promise<HistologySession | null>;

  /** Persist a brand-new session. */
  create(session: HistologySession): Promise<void>;

  /**
   * Persist changes to an existing session.
   * @throws NotFoundError if no session with `session.id` exists.
   */
  update(session: HistologySession): Promise<void>;

  /** Permanently delete a histology-session row. Idempotent; cascade in the app layer. */
  delete(id: string): Promise<void>;
}
