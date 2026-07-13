import type { StoredFile } from "@/domain/entities/stored-file";

/**
 * Port: persistence for {@link StoredFile} metadata rows (never the image bytes).
 *
 * Implementations receive fully-formed entities (ids/timestamps generated in the
 * application layer). A research asset may accumulate multiple stored files over
 * time (e.g. after a "replace"); the most recent is the current image. There is
 * intentionally **no delete** — attachment history is preserved, and no filesystem
 * deletes are performed.
 */
export interface StorageRepository {
  /** A research asset's stored files, most recent first. */
  listByAsset(researchAssetId: string): Promise<StoredFile[]>;

  /** The most recently attached file for an asset, or null if none. */
  getLatestByAsset(researchAssetId: string): Promise<StoredFile | null>;

  /** A single stored file by id, or null if none exists. */
  getById(id: string): Promise<StoredFile | null>;

  /** Persist a brand-new stored-file record. */
  create(file: StoredFile): Promise<void>;

  /** Permanently delete a stored-file row (v1.4). Idempotent. The file on disk is
   *  removed separately via the FileStore. */
  delete(id: string): Promise<void>;
}
