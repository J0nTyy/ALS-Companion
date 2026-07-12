import { describe, expect, it } from "vitest";

import {
  mapRowToAnimal,
  type AnimalRow,
} from "@/infrastructure/repositories/animal-row-mapper";

const baseRow: AnimalRow = {
  id: "a1",
  study_id: "s1",
  animal_identifier: "M-014",
  sex: "female",
  date_of_birth: null,
  mutation: null,
  treatment_group: null,
  created_at: "2026-07-12T00:00:00.000Z",
  updated_at: "2026-07-12T09:30:00.000Z",
};

describe("mapRowToAnimal", () => {
  it("maps snake_case columns to the domain entity", () => {
    expect(mapRowToAnimal(baseRow)).toEqual({
      id: "a1",
      studyId: "s1",
      animalIdentifier: "M-014",
      sex: "female",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T09:30:00.000Z",
    });
  });

  it("omits NULL optional columns", () => {
    const animal = mapRowToAnimal(baseRow);
    expect("dateOfBirth" in animal).toBe(false);
    expect("mutation" in animal).toBe(false);
    expect("treatmentGroup" in animal).toBe(false);
  });

  it("includes and trims populated optional columns", () => {
    const animal = mapRowToAnimal({
      ...baseRow,
      date_of_birth: "2025-03-04",
      mutation: "  SOD1-G93A ",
      treatment_group: " Riluzole ",
    });
    expect(animal.dateOfBirth).toBe("2025-03-04");
    expect(animal.mutation).toBe("SOD1-G93A");
    expect(animal.treatmentGroup).toBe("Riluzole");
  });

  it("throws on an unrecognized sex so corrupt data surfaces", () => {
    expect(() => mapRowToAnimal({ ...baseRow, sex: "other" })).toThrow();
  });

  it("throws on a malformed persisted date of birth", () => {
    expect(() =>
      mapRowToAnimal({ ...baseRow, date_of_birth: "2026/01/01" }),
    ).toThrow();
  });

  it("throws on an impossible persisted date of birth", () => {
    expect(() =>
      mapRowToAnimal({ ...baseRow, date_of_birth: "2026-02-30" }),
    ).toThrow();
  });
});
