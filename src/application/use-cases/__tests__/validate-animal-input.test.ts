import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import { validateAnimalFields } from "@/application/use-cases/validate-animal-input";

const TODAY = "2026-07-12";

describe("validateAnimalFields", () => {
  it("trims the animal identifier", () => {
    const result = validateAnimalFields(
      { animalIdentifier: "  M-014  " },
      TODAY,
    );
    expect(result.animalIdentifier).toBe("M-014");
  });

  it("defaults sex to unknown", () => {
    const result = validateAnimalFields({ animalIdentifier: "M-1" }, TODAY);
    expect(result.sex).toBe("unknown");
  });

  it("rejects an empty identifier at the right field", () => {
    try {
      validateAnimalFields({ animalIdentifier: "   " }, TODAY);
      expect.unreachable("expected a ValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe("animalIdentifier");
    }
  });

  it("rejects an unknown sex", () => {
    expect(() =>
      validateAnimalFields({ animalIdentifier: "M-1", sex: "other" }, TODAY),
    ).toThrowError(ValidationError);
  });

  it("keeps arbitrary treatment groups as free text", () => {
    for (const group of ["Control", "Vehicle", "Riluzole", "Edaravone", "XYZ-9"]) {
      const result = validateAnimalFields(
        { animalIdentifier: "M-1", treatmentGroup: group },
        TODAY,
      );
      expect(result.treatmentGroup).toBe(group);
    }
  });

  it("omits blank optional fields", () => {
    const result = validateAnimalFields(
      {
        animalIdentifier: "M-1",
        dateOfBirth: "   ",
        mutation: "  ",
        treatmentGroup: "",
      },
      TODAY,
    );
    expect("dateOfBirth" in result).toBe(false);
    expect("mutation" in result).toBe(false);
    expect("treatmentGroup" in result).toBe(false);
  });

  it("accepts a valid past date of birth", () => {
    const result = validateAnimalFields(
      { animalIdentifier: "M-1", dateOfBirth: "2025-03-04" },
      TODAY,
    );
    expect(result.dateOfBirth).toBe("2025-03-04");
  });

  it("accepts a date of birth equal to today", () => {
    const result = validateAnimalFields(
      { animalIdentifier: "M-1", dateOfBirth: TODAY },
      TODAY,
    );
    expect(result.dateOfBirth).toBe(TODAY);
  });

  it("rejects a future date of birth", () => {
    try {
      validateAnimalFields(
        { animalIdentifier: "M-1", dateOfBirth: "2030-01-01" },
        TODAY,
      );
      expect.unreachable("expected a ValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).field).toBe("dateOfBirth");
    }
  });

  it("rejects a malformed date", () => {
    expect(() =>
      validateAnimalFields(
        { animalIdentifier: "M-1", dateOfBirth: "2026/01/01" },
        TODAY,
      ),
    ).toThrowError(ValidationError);
  });

  it("rejects an impossible calendar date", () => {
    expect(() =>
      validateAnimalFields(
        { animalIdentifier: "M-1", dateOfBirth: "2026-02-30" },
        TODAY,
      ),
    ).toThrowError(ValidationError);
  });
});
