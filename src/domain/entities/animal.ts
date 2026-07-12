/**
 * Domain entity: Animal
 * ----------------------------------------------------------------------------
 * An Animal is an individual mouse tracked within a {@link Study}. This module
 * defines its shape and vocabulary with no dependency on React, SQLite, or Tauri
 * so it can be reasoned about and tested in isolation.
 */

export const ANIMAL_SEXES = ["female", "male", "unknown"] as const;

export type AnimalSex = (typeof ANIMAL_SEXES)[number];

export interface Animal {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The study this animal belongs to. */
  readonly studyId: string;
  /**
   * Researcher-facing identifier (cage/ear-tag/lab id). Required, and unique
   * within its study — the same value may be reused in a different study.
   */
  animalIdentifier: string;
  /** Biological sex. Defaults to "unknown" when not recorded. */
  sex: AnimalSex;
  /** Optional date of birth, stored as a timezone-free `YYYY-MM-DD` string. */
  dateOfBirth?: string;
  /** Optional free-text mutation / genotype, e.g. "SOD1-G93A". */
  mutation?: string;
  /**
   * Optional free-text treatment group, e.g. "Control", "Vehicle", "Riluzole".
   * Deliberately not an enum — researchers may use any group without code
   * changes.
   */
  treatmentGroup?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when adding an animal to a study. */
export type NewAnimalInput = Pick<Animal, "studyId" | "animalIdentifier"> &
  Partial<Pick<Animal, "sex" | "dateOfBirth" | "mutation" | "treatmentGroup">>;

/** Fields a researcher can change when editing an existing animal. */
export type UpdateAnimalInput = Pick<Animal, "id" | "animalIdentifier"> &
  Partial<Pick<Animal, "sex" | "dateOfBirth" | "mutation" | "treatmentGroup">>;

/** User-facing labels for each sex value. */
export const ANIMAL_SEX_META: Record<AnimalSex, { label: string }> = {
  female: { label: "Female" },
  male: { label: "Male" },
  unknown: { label: "Unknown" },
};

export function isAnimalSex(value: unknown): value is AnimalSex {
  return (
    typeof value === "string" &&
    (ANIMAL_SEXES as readonly string[]).includes(value)
  );
}
