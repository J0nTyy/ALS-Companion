import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import { validateStudyFields } from "@/application/use-cases/validate-study-input";

describe("validateStudyFields", () => {
  it("trims name and strain", () => {
    const result = validateStudyFields({
      name: "  Cohort A  ",
      strain: "  SOD1-G93A ",
    });
    expect(result.name).toBe("Cohort A");
    expect(result.strain).toBe("SOD1-G93A");
  });

  it("defaults the status to planning", () => {
    const result = validateStudyFields({ name: "x", strain: "y" });
    expect(result.status).toBe("planning");
  });

  it("omits a blank description entirely", () => {
    const result = validateStudyFields({
      name: "x",
      strain: "y",
      description: "   ",
    });
    expect("description" in result).toBe(false);
  });

  it("keeps a trimmed, non-empty description", () => {
    const result = validateStudyFields({
      name: "x",
      strain: "y",
      description: "  daily weights  ",
    });
    expect(result.description).toBe("daily weights");
  });

  it("rejects an empty name and points at the field", () => {
    try {
      validateStudyFields({ name: "   ", strain: "y" });
      expect.unreachable("expected a ValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe("name");
    }
  });

  it("rejects an empty strain and points at the field", () => {
    try {
      validateStudyFields({ name: "x", strain: "" });
      expect.unreachable("expected a ValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe("strain");
    }
  });

  it("rejects an unknown status", () => {
    expect(() =>
      validateStudyFields({ name: "x", strain: "y", status: "bogus" }),
    ).toThrowError(ValidationError);
  });
});
