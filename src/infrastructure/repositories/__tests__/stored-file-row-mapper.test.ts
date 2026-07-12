import { describe, expect, it } from "vitest";

import {
  mapRowToStoredFile,
  type StoredFileRow,
} from "@/infrastructure/repositories/stored-file-row-mapper";

const baseRow: StoredFileRow = {
  id: "sf1",
  research_asset_id: "asset1",
  storage_type: "local_managed",
  relative_path: "images/sf1.png",
  original_name: "scan.png",
  mime_type: "image/png",
  checksum: null,
  created_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToStoredFile", () => {
  it("maps a row and omits a null checksum", () => {
    expect(mapRowToStoredFile(baseRow)).toEqual({
      id: "sf1",
      researchAssetId: "asset1",
      storageType: "local_managed",
      relativePath: "images/sf1.png",
      originalName: "scan.png",
      mimeType: "image/png",
      createdAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("includes and trims a populated checksum", () => {
    expect(
      mapRowToStoredFile({ ...baseRow, checksum: "  abc123 " }).checksum,
    ).toBe("abc123");
  });

  it("throws on an empty relative path, original name, or mime type", () => {
    expect(() => mapRowToStoredFile({ ...baseRow, relative_path: "  " })).toThrow();
    expect(() => mapRowToStoredFile({ ...baseRow, original_name: "" })).toThrow();
    expect(() => mapRowToStoredFile({ ...baseRow, mime_type: "  " })).toThrow();
  });

  it("throws on an unrecognized storage type", () => {
    expect(() =>
      mapRowToStoredFile({ ...baseRow, storage_type: "s3_bucket" }),
    ).toThrow();
  });
});
