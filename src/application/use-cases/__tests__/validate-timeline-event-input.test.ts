import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import { validateTimelineEventFields } from "@/application/use-cases/validate-timeline-event-input";

function expectField(fn: () => unknown, field: string) {
  try {
    fn();
    expect.unreachable("expected a ValidationError");
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).field).toBe(field);
  }
}

describe("validateTimelineEventFields", () => {
  it("trims the title and rejects an empty one", () => {
    const result = validateTimelineEventFields({
      title: "  Confirm SOD1 genotype  ",
      category: "gene_confirmation",
    });
    expect(result.title).toBe("Confirm SOD1 genotype");
    expectField(
      () => validateTimelineEventFields({ title: "   ", category: "mri" }),
      "title",
    );
  });

  it("requires a known category", () => {
    expectField(
      () => validateTimelineEventFields({ title: "x", category: "surgery" }),
      "category",
    );
  });

  it("defaults status to planned and rejects unknown status", () => {
    const result = validateTimelineEventFields({ title: "x", category: "mri" });
    expect(result.status).toBe("planned");
    expectField(
      () =>
        validateTimelineEventFields({
          title: "x",
          category: "mri",
          status: "cancelled",
        }),
      "status",
    );
  });

  it("accepts a FUTURE planned date (not a calendar/scheduler restriction)", () => {
    const result = validateTimelineEventFields({
      title: "x",
      category: "mri",
      plannedDate: "2999-12-31",
    });
    expect(result.plannedDate).toBe("2999-12-31");
  });

  it("rejects a malformed or impossible date", () => {
    expectField(
      () =>
        validateTimelineEventFields({
          title: "x",
          category: "mri",
          plannedDate: "2026/01/01",
        }),
      "plannedDate",
    );
    expectField(
      () =>
        validateTimelineEventFields({
          title: "x",
          category: "mri",
          completedDate: "2026-02-30",
        }),
      "completedDate",
    );
  });

  it("drops blank optional dates and notes", () => {
    const result = validateTimelineEventFields({
      title: "x",
      category: "mri",
      plannedDate: "   ",
      completedDate: "",
      notes: "  ",
    });
    expect("plannedDate" in result).toBe(false);
    expect("completedDate" in result).toBe(false);
    expect("notes" in result).toBe(false);
  });

  it("keeps trimmed notes and valid dates", () => {
    const result = validateTimelineEventFields({
      title: "x",
      category: "histopathology",
      status: "completed",
      completedDate: "2026-07-10",
      notes: "  spinal cord sampled ",
    });
    expect(result.completedDate).toBe("2026-07-10");
    expect(result.notes).toBe("spinal cord sampled");
    expect(result.status).toBe("completed");
  });
});
