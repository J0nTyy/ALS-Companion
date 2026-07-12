import { isAnimalSex, type Animal } from "@/domain/entities/animal";
import { isValidDateOnly } from "@/domain/value-objects/date-only";

/**
 * A row as returned by SQLite for the `animals` table. Columns are snake_case
 * and every optional column may be NULL.
 *
 * This module deliberately has **no** Tauri import so the mapping logic can be
 * unit-tested in a plain Node environment.
 */
export interface AnimalRow {
  id: string;
  study_id: string;
  animal_identifier: string;
  sex: string;
  date_of_birth: string | null;
  mutation: string | null;
  treatment_group: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link Animal}.
 *
 * - snake_case columns become camelCase fields.
 * - NULL/empty optional columns are omitted (not stored as empty strings).
 * - an unrecognized sex, or a non-empty but malformed/impossible date of birth,
 *   throws — so corrupt data surfaces loudly rather than displaying a wrong day.
 */
export function mapRowToAnimal(row: AnimalRow): Animal {
  if (!isAnimalSex(row.sex)) {
    throw new Error(
      `Animal ${row.id} has an unrecognized sex: ${String(row.sex)}`,
    );
  }

  const dateOfBirth = row.date_of_birth?.trim() ?? "";
  if (dateOfBirth.length > 0 && !isValidDateOnly(dateOfBirth)) {
    throw new Error(
      `Animal ${row.id} has an invalid date of birth: ${String(row.date_of_birth)}`,
    );
  }

  const mutation = row.mutation?.trim() ?? "";
  const treatmentGroup = row.treatment_group?.trim() ?? "";

  return {
    id: row.id,
    studyId: row.study_id,
    animalIdentifier: row.animal_identifier,
    sex: row.sex,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(dateOfBirth.length > 0 ? { dateOfBirth } : {}),
    ...(mutation.length > 0 ? { mutation } : {}),
    ...(treatmentGroup.length > 0 ? { treatmentGroup } : {}),
  };
}
