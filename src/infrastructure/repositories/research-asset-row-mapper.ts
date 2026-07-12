import {
  isResearchAssetOwnerType,
  isResearchAssetStatus,
  isResearchAssetType,
  type ResearchAsset,
} from "@/domain/entities/research-asset";

/**
 * A row as returned by SQLite for the `research_assets` table. Columns are
 * snake_case; `description` may be NULL. There is deliberately no file-path or
 * blob column — a research asset is metadata only.
 *
 * No Tauri import, so the mapping logic is unit-testable in a plain Node env.
 */
export interface ResearchAssetRow {
  id: string;
  owner_type: string;
  owner_id: string;
  asset_type: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link ResearchAsset}, failing loudly on corrupt
 * data: an empty title, or an unrecognized owner type, asset type, or status.
 */
export function mapRowToResearchAsset(row: ResearchAssetRow): ResearchAsset {
  const title = row.title?.trim() ?? "";
  if (title.length === 0) {
    throw new Error(`Research asset ${row.id} has an empty title`);
  }
  if (!isResearchAssetOwnerType(row.owner_type)) {
    throw new Error(
      `Research asset ${row.id} has an unrecognized owner type: ${String(row.owner_type)}`,
    );
  }
  if (!isResearchAssetType(row.asset_type)) {
    throw new Error(
      `Research asset ${row.id} has an unrecognized asset type: ${String(row.asset_type)}`,
    );
  }
  if (!isResearchAssetStatus(row.status)) {
    throw new Error(
      `Research asset ${row.id} has an unrecognized status: ${String(row.status)}`,
    );
  }

  const description = row.description?.trim() ?? "";

  return {
    id: row.id,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    assetType: row.asset_type,
    title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(description.length > 0 ? { description } : {}),
  };
}
