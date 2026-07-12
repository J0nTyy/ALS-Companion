import type { StoredFile } from "@/domain/entities/stored-file";
import type { StorageRepository } from "@/application/ports/storage-repository";
import { getDatabase } from "@/infrastructure/db/database";
import {
  mapRowToStoredFile,
  type StoredFileRow,
} from "./stored-file-row-mapper";

const COLUMNS =
  "id, research_asset_id, storage_type, relative_path, original_name, mime_type, checksum, created_at";

/**
 * SQLite-backed {@link StorageRepository} using the Tauri SQL plugin.
 *
 * Persists stored-file METADATA only — never image bytes. All statements are
 * parameterized. Listing is newest-first. There is intentionally no update or
 * delete: attachment history is preserved and the most recent row is the current
 * image.
 */
export class SqliteStorageRepository implements StorageRepository {
  async listByAsset(researchAssetId: string): Promise<StoredFile[]> {
    const db = await getDatabase();
    const rows = await db.select<StoredFileRow[]>(
      `SELECT ${COLUMNS} FROM stored_files
       WHERE research_asset_id = $1
       ORDER BY created_at DESC`,
      [researchAssetId],
    );
    return rows.map(mapRowToStoredFile);
  }

  async getLatestByAsset(researchAssetId: string): Promise<StoredFile | null> {
    const db = await getDatabase();
    const rows = await db.select<StoredFileRow[]>(
      `SELECT ${COLUMNS} FROM stored_files
       WHERE research_asset_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [researchAssetId],
    );
    const row = rows[0];
    return row ? mapRowToStoredFile(row) : null;
  }

  async getById(id: string): Promise<StoredFile | null> {
    const db = await getDatabase();
    const rows = await db.select<StoredFileRow[]>(
      `SELECT ${COLUMNS} FROM stored_files WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToStoredFile(row) : null;
  }

  async create(file: StoredFile): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO stored_files
         (id, research_asset_id, storage_type, relative_path, original_name,
          mime_type, checksum, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        file.id,
        file.researchAssetId,
        file.storageType,
        file.relativePath,
        file.originalName,
        file.mimeType,
        file.checksum ?? null,
        file.createdAt,
      ],
    );
  }
}
