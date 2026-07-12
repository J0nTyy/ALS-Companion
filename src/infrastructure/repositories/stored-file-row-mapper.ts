import { isStorageType, type StoredFile } from "@/domain/entities/stored-file";

/**
 * A row as returned by SQLite for the `stored_files` table. `checksum` may be
 * NULL. No Tauri import, so the mapping logic is unit-testable in plain Node.
 */
export interface StoredFileRow {
  id: string;
  research_asset_id: string;
  storage_type: string;
  relative_path: string;
  original_name: string;
  mime_type: string;
  checksum: string | null;
  created_at: string;
}

/**
 * Map a database row to a domain {@link StoredFile}, failing loudly on corrupt
 * data: an empty relative path / original name / mime type, or an unrecognized
 * storage type.
 */
export function mapRowToStoredFile(row: StoredFileRow): StoredFile {
  const relativePath = row.relative_path?.trim() ?? "";
  if (relativePath.length === 0) {
    throw new Error(`Stored file ${row.id} has an empty relative path`);
  }
  const originalName = row.original_name?.trim() ?? "";
  if (originalName.length === 0) {
    throw new Error(`Stored file ${row.id} has an empty original name`);
  }
  const mimeType = row.mime_type?.trim() ?? "";
  if (mimeType.length === 0) {
    throw new Error(`Stored file ${row.id} has an empty mime type`);
  }
  if (!isStorageType(row.storage_type)) {
    throw new Error(
      `Stored file ${row.id} has an unrecognized storage type: ${String(row.storage_type)}`,
    );
  }

  const checksum = row.checksum?.trim() ?? "";

  return {
    id: row.id,
    researchAssetId: row.research_asset_id,
    storageType: row.storage_type,
    relativePath,
    originalName,
    mimeType,
    createdAt: row.created_at,
    ...(checksum.length > 0 ? { checksum } : {}),
  };
}
