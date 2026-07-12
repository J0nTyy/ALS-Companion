import { describe, expect, it } from "vitest";

import {
  mapRowToResearchAsset,
  type ResearchAssetRow,
} from "@/infrastructure/repositories/research-asset-row-mapper";

const baseRow: ResearchAssetRow = {
  id: "asset1",
  owner_type: "mri_session",
  owner_id: "mri1",
  asset_type: "mri_image",
  title: "Baseline T2 series",
  description: null,
  status: "planned",
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToResearchAsset", () => {
  it("maps a row and omits the null description", () => {
    expect(mapRowToResearchAsset(baseRow)).toEqual({
      id: "asset1",
      ownerType: "mri_session",
      ownerId: "mri1",
      assetType: "mri_image",
      title: "Baseline T2 series",
      status: "planned",
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("includes and trims a populated description", () => {
    const asset = mapRowToResearchAsset({
      ...baseRow,
      description: "  Radiologist summary ",
    });
    expect(asset.description).toBe("Radiologist summary");
  });

  it('maps the reserved "attached" status (persisted values are accepted)', () => {
    expect(mapRowToResearchAsset({ ...baseRow, status: "attached" }).status).toBe(
      "attached",
    );
  });

  it("throws on empty title, or bad owner type / asset type / status", () => {
    expect(() => mapRowToResearchAsset({ ...baseRow, title: "  " })).toThrow();
    expect(() =>
      mapRowToResearchAsset({ ...baseRow, owner_type: "animal" }),
    ).toThrow();
    expect(() =>
      mapRowToResearchAsset({ ...baseRow, asset_type: "dicom" }),
    ).toThrow();
    expect(() =>
      mapRowToResearchAsset({ ...baseRow, status: "uploaded" }),
    ).toThrow();
  });
});
