import { afterEach, describe, expect, it, vi } from "vitest";

import type { StoredFile } from "@/domain/entities/stored-file";
import type { StoredFileRow } from "@/infrastructure/repositories/stored-file-row-mapper";
import { SqliteStorageRepository } from "@/infrastructure/repositories/sqlite-storage-repository";

const { execute, select } = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select }),
}));

const file: StoredFile = {
  id: "sf1",
  researchAssetId: "asset1",
  storageType: "local_managed",
  relativePath: "images/sf1.png",
  originalName: "scan.png",
  mimeType: "image/png",
  createdAt: "t",
};

const row: StoredFileRow = {
  id: "sf1",
  research_asset_id: "asset1",
  storage_type: "local_managed",
  relative_path: "images/sf1.png",
  original_name: "scan.png",
  mime_type: "image/png",
  checksum: null,
  created_at: "t",
};

afterEach(() => {
  execute.mockReset();
  select.mockReset();
});

describe("SqliteStorageRepository", () => {
  it("inserts a new stored-file row on create", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteStorageRepository().create(file),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(String(execute.mock.calls[0]?.[0])).toContain(
      "INSERT INTO stored_files",
    );
  });

  it("maps the newest row for getLatestByAsset", async () => {
    select.mockResolvedValue([row]);
    const latest = await new SqliteStorageRepository().getLatestByAsset("asset1");
    expect(latest?.id).toBe("sf1");
    expect(latest?.relativePath).toBe("images/sf1.png");
  });

  it("returns null from getLatestByAsset when there are no files", async () => {
    select.mockResolvedValue([]);
    const latest = await new SqliteStorageRepository().getLatestByAsset("asset1");
    expect(latest).toBeNull();
  });
});
