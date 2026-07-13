import type {
  ResearchAsset,
  ResearchAssetOwnerType,
} from "@/domain/entities/research-asset";

/**
 * Port: persistence for {@link ResearchAsset} entities (metadata only — never a
 * file path, blob, or binary data).
 *
 * The association to an owner is polymorphic (`ownerType`, `ownerId`), so there is
 * intentionally **no database foreign key**; owner existence is verified in the
 * application layer. There is no delete operation.
 *
 * **Contract for mutations of existing rows.** `update` MUST NOT report success
 * when no row matched the target id; it must detect "no rows changed" and throw
 * `NotFoundError`.
 */
export interface ResearchAssetRepository {
  /** Assets owned by `(ownerType, ownerId)`, newest first. */
  listByOwner(
    ownerType: ResearchAssetOwnerType,
    ownerId: string,
  ): Promise<ResearchAsset[]>;

  /** A single asset by id, or null if none exists. */
  getById(id: string): Promise<ResearchAsset | null>;

  /** Persist a brand-new asset (metadata placeholder). */
  create(asset: ResearchAsset): Promise<void>;

  /**
   * Persist changes to an existing asset's metadata.
   * @throws NotFoundError if no asset with `asset.id` exists.
   */
  update(asset: ResearchAsset): Promise<void>;

  /** Permanently delete a research-asset row (v1.4). Idempotent; stored files removed in the app layer. */
  delete(id: string): Promise<void>;
}
