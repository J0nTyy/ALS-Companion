import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import { validateMriSessionFields } from "@/application/use-cases/validate-mri-session-input";

function expectField(fn: () => unknown, field: string) {
  try {
    fn();
    expect.unreachable("expected a ValidationError");
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).field).toBe(field);
  }
}

describe("validateMriSessionFields", () => {
  it("requires a title", () => {
    expectField(
      () =>
        validateMriSessionFields({
          title: "  ",
          modality: "mri",
          acquisitionDate: "2026-07-13",
        }),
      "title",
    );
  });

  it("requires a known modality", () => {
    expectField(
      () =>
        validateMriSessionFields({
          title: "Brain MRI",
          modality: "pet",
          acquisitionDate: "2026-07-13",
        }),
      "modality",
    );
  });

  it("requires a valid acquisition date", () => {
    expectField(
      () =>
        validateMriSessionFields({
          title: "Brain MRI",
          modality: "mri",
          acquisitionDate: "2026/07/13",
        }),
      "acquisitionDate",
    );
    expectField(
      () =>
        validateMriSessionFields({
          title: "Brain MRI",
          modality: "mri",
          acquisitionDate: "2026-02-30",
        }),
      "acquisitionDate",
    );
  });

  it("defaults modality to mri and trims/drops optional fields", () => {
    const result = validateMriSessionFields({
      title: "  Baseline MRI ",
      acquisitionDate: "2026-07-13",
      anatomicalRegion: "  Brain ",
      operator: "  ",
      notes: "  T2 sequence ",
    });
    expect(result.title).toBe("Baseline MRI");
    expect(result.modality).toBe("mri");
    expect(result.anatomicalRegion).toBe("Brain");
    expect("operator" in result).toBe(false);
    expect(result.notes).toBe("T2 sequence");
  });
});
