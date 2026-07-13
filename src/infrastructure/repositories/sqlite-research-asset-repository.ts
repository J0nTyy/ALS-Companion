import type {
  ResearchAsset,
  ResearchAssetOwnerType,
  ResearchAssetStatus,
  ResearchAssetType,
} from "@/domain/entities/research-asset";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type {
  ResearchAssetSearchReader,
  SearchHit,
} from "@/application/ports/search";
import type { SearchQuery } from "@/domain/entities/search";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import { researchAssetHit } from "@/application/use-cases/search/search-hit";
import {
  mapRowToResearchAsset,
  type ResearchAssetRow,
} from "./research-asset-row-mapper";
import { SearchConditionBuilder, SEARCH_PER_TYPE_LIMIT } from "./search-sql";

const COLUMNS =
  "id, owner_type, owner_id, asset_type, title, description, status, created_at, updated_at";

const RESEARCH_ASSET_NOT_FOUND = "That research asset could not be found.";

/**
 * SQLite-backed {@link ResearchAssetRepository} using the Tauri SQL plugin.
 *
 * Persists metadata only — never a file path, blob, or binary data. All
 * statements are parameterized. Listing is ordered newest-first. There is no
 * delete path. `update` inspects `rowsAffected` and throws {@link NotFoundError}
 * when nothing changed.
 */
export class SqliteResearchAssetRepository
  implements ResearchAssetRepository, ResearchAssetSearchReader
{
  async searchResearchAssets(query: SearchQuery): Promise<SearchHit[]> {
    const f = query.filters;
    const c = new SearchConditionBuilder();
    c.text(["ra.title", "ra.description"], query.text);
    // Only the mri_session owner type exists today; the joins below assume it.
    c.raw("ra.owner_type = 'mri_session'");
    c.eq("a.study_id", f.studyId);
    c.eq("te.animal_id", f.animalId);
    c.eq("ra.asset_type", f.researchAssetType);
    c.eq("ra.status", f.status);
    if (!c.hasUserConditions()) return [];

    const db = await getDatabase();
    const rows = await db.select<
      Array<{
        id: string;
        title: string;
        asset_type: string;
        status: string;
        animal_id: string;
        study_id: string;
        animal_identifier: string;
      }>
    >(
      `SELECT ra.id, ra.title, ra.asset_type, ra.status,
              te.animal_id AS animal_id, a.study_id, a.animal_identifier
       FROM research_assets ra
       JOIN mri_sessions m ON m.id = ra.owner_id
       JOIN timeline_events te ON te.id = m.timeline_event_id
       JOIN animals a ON a.id = te.animal_id
       ${c.whereSql()}
       ORDER BY ra.created_at DESC LIMIT ${SEARCH_PER_TYPE_LIMIT}`,
      c.params,
    );
    return rows.map((r) =>
      researchAssetHit({
        id: r.id,
        studyId: r.study_id,
        animalId: r.animal_id,
        title: r.title,
        assetType: r.asset_type as ResearchAssetType,
        status: r.status as ResearchAssetStatus,
        animalIdentifier: r.animal_identifier,
      }),
    );
  }

  async listByOwner(
    ownerType: ResearchAssetOwnerType,
    ownerId: string,
  ): Promise<ResearchAsset[]> {
    const db = await getDatabase();
    const rows = await db.select<ResearchAssetRow[]>(
      `SELECT ${COLUMNS} FROM research_assets
       WHERE owner_type = $1 AND owner_id = $2
       ORDER BY created_at DESC`,
      [ownerType, ownerId],
    );
    return rows.map(mapRowToResearchAsset);
  }

  async getById(id: string): Promise<ResearchAsset | null> {
    const db = await getDatabase();
    const rows = await db.select<ResearchAssetRow[]>(
      `SELECT ${COLUMNS} FROM research_assets WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToResearchAsset(row) : null;
  }

  async create(asset: ResearchAsset): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO research_assets
         (id, owner_type, owner_id, asset_type, title, description, status,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        asset.id,
        asset.ownerType,
        asset.ownerId,
        asset.assetType,
        asset.title,
        asset.description ?? null,
        asset.status,
        asset.createdAt,
        asset.updatedAt,
      ],
    );
  }

  async update(asset: ResearchAsset): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE research_assets
         SET asset_type = $1, title = $2, description = $3, status = $4,
             updated_at = $5
       WHERE id = $6`,
      [
        asset.assetType,
        asset.title,
        asset.description ?? null,
        asset.status,
        asset.updatedAt,
        asset.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(RESEARCH_ASSET_NOT_FOUND);
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM research_assets WHERE id = $1`, [id]);
  }
}
