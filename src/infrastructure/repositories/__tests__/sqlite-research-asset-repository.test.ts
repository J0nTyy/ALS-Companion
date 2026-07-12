import { afterEach, describe, expect, it, vi } from "vitest";

import type { ResearchAsset } from "@/domain/entities/research-asset";
import { NotFoundError } from "@/application/errors";
import { SqliteResearchAssetRepository } from "@/infrastructure/repositories/sqlite-research-asset-repository";

// A controllable fake `execute` so we can drive `rowsAffected` without SQLite.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select: vi.fn() }),
}));

const asset: ResearchAsset = {
  id: "asset1",
  ownerType: "mri_session",
  ownerId: "mri1",
  assetType: "mri_image",
  title: "Baseline T2 series",
  status: "planned",
  createdAt: "t",
  updatedAt: "t",
};

afterEach(() => execute.mockReset());

describe("SqliteResearchAssetRepository not-found guard", () => {
  it("update throws NotFoundError when no row changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteResearchAssetRepository().update(asset),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update resolves when a row changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteResearchAssetRepository().update(asset),
    ).resolves.toBeUndefined();
  });

  it("create resolves on success", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteResearchAssetRepository().create(asset),
    ).resolves.toBeUndefined();
  });
});
