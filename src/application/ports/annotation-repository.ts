import type { Annotation } from "@/domain/entities/annotation";

/**
 * Port: persistence for {@link Annotation} entities.
 *
 * The application layer depends on this interface only; a concrete SQLite adapter
 * lives in `infrastructure`. Implementations receive fully-formed entities — ids
 * and timestamps are generated in the application layer. Geometry is serialized by
 * the adapter (an opaque string column), never spread across coordinate columns,
 * so future annotation shapes need no schema change.
 *
 * **Contract for mutations of existing rows.** `update` MUST NOT report success
 * when no row matched the target id; it must detect "no rows changed" and throw
 * `NotFoundError` (from `@/application/errors`). `delete` is idempotent — deleting
 * a missing row is a no-op (consistent with the v1.4 delete surface).
 */
export interface AnnotationRepository {
  /** A stored image's annotations, oldest first (stable draw order). */
  listByStoredFile(storedFileId: string): Promise<Annotation[]>;

  /** A single annotation by id, or null if none exists. */
  getById(id: string): Promise<Annotation | null>;

  /** Persist a brand-new annotation. */
  create(annotation: Annotation): Promise<void>;

  /**
   * Persist changes to an existing annotation.
   * @throws NotFoundError if no annotation with `annotation.id` exists.
   */
  update(annotation: Annotation): Promise<void>;

  /** Permanently delete an annotation row. Idempotent. */
  delete(id: string): Promise<void>;
}
