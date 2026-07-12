import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import { validateResearchAssetFields } from "@/application/use-cases/validate-research-asset-input";

function expectField(fn: () => unknown, field: string) {
  try {
    fn();
    expect.unreachable("expected a ValidationError");
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).field).toBe(field);
  }
}

describe("validateResearchAssetFields", () => {
  it("requires a title", () => {
    expectField(
      () => validateResearchAssetFields({ assetType: "mri_image", title: "  " }),
      "title",
    );
  });

  it("requires a known asset type", () => {
    expectField(
      () =>
        validateResearchAssetFields({ assetType: "dicom", title: "Series 1" }),
      "assetType",
    );
    expectField(
      () => validateResearchAssetFields({ title: "Series 1" }),
      "assetType",
    );
  });

  it('rejects the reserved "attached" status as manual input', () => {
    expectField(
      () =>
        validateResearchAssetFields({
          assetType: "mri_image",
          title: "Series 1",
          status: "attached",
        }),
      "status",
    );
  });

  it("rejects an unknown status", () => {
    expectField(
      () =>
        validateResearchAssetFields({
          assetType: "mri_image",
          title: "Series 1",
          status: "uploaded",
        }),
      "status",
    );
  });

  it("defaults status to planned and trims/drops the optional description", () => {
    const result = validateResearchAssetFields({
      assetType: "histology_image",
      title: "  Spinal cord H&E ",
      description: "  ",
    });
    expect(result.title).toBe("Spinal cord H&E");
    expect(result.assetType).toBe("histology_image");
    expect(result.status).toBe("planned");
    expect("description" in result).toBe(false);
  });

  it("accepts pending_attachment and keeps a populated description", () => {
    const result = validateResearchAssetFields({
      assetType: "pdf",
      title: "Scan report",
      status: "pending_attachment",
      description: "  Radiologist summary ",
    });
    expect(result.status).toBe("pending_attachment");
    expect(result.description).toBe("Radiologist summary");
  });
});
