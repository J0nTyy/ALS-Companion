import type { Study } from "@/domain/entities/study";

/** Options that shape how studies are listed. */
export interface StudyListOptions {
  /** When true, archived studies are included (after active ones). */
  includeArchived?: boolean;
}

/**
 * Narrow read-only view of studies. Depended on by the animal use cases to
 * verify a parent study exists and is not archived — without granting them the
 * full write surface of {@link StudyRepository}.
 */
export interface StudyReader {
  getById(id: string): Promise<Study | null>;
}

/**
 * Port: persistence for {@link Study} entities.
 *
 * The application layer depends on this interface only; a concrete adapter
 * (SQLite via the Tauri SQL plugin) lives in `infrastructure`. This keeps all
 * storage details out of business logic (dependency inversion).
 *
 * Implementations receive fully-formed entities — identifiers and timestamps are
 * generated in the application layer, never inside the adapter or the UI.
 *
 * **Contract for mutations of existing rows.** `update` and `archive` MUST NOT
 * report success when no row matched the target id. An implementation must detect
 * "no rows changed" and throw `NotFoundError` (from `@/application/errors`). This
 * prevents silent persistence failures where the UI believes a save happened but
 * nothing did.
 */
export interface StudyRepository extends StudyReader {
  /** Return studies, newest-updated first; excludes archived unless requested. */
  list(options?: StudyListOptions): Promise<Study[]>;

  /** Return a single study by id, or null if none exists. (from StudyReader) */
  getById(id: string): Promise<Study | null>;

  /** Persist a brand-new study. */
  create(study: Study): Promise<void>;

  /**
   * Persist changes to an existing study.
   * Throws `NotFoundError` if no study with `study.id` exists.
   */
  update(study: Study): Promise<void>;

  /**
   * Mark a study as archived. This never deletes data — it sets the study's
   * status to "archived" and stamps the provided modification time.
   * Throws `NotFoundError` if no study with `id` exists.
   */
  archive(id: string, updatedAt: string): Promise<void>;
}
