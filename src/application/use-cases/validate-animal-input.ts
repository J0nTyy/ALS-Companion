import { isAnimalSex, type AnimalSex } from "@/domain/entities/animal";
import { isValidDateOnly } from "@/domain/value-objects/date-only";
import { ValidationError } from "@/application/errors";

/** Raw, possibly-untrimmed fields coming from a form. */
export interface AnimalFieldsInput {
  animalIdentifier?: string;
  sex?: string;
  dateOfBirth?: string;
  mutation?: string;
  treatmentGroup?: string;
}

/** Clean, validated fields ready to build an {@link Animal}. */
export interface ValidatedAnimalFields {
  animalIdentifier: string;
  sex: AnimalSex;
  /** Present only when a valid, non-future `YYYY-MM-DD` was provided. */
  dateOfBirth?: string;
  mutation?: string;
  treatmentGroup?: string;
}

/**
 * Validate and normalize the fields a researcher entered for an animal.
 *
 * - `animalIdentifier` is trimmed and must be non-empty.
 * - `sex` defaults to "unknown" and must be a known {@link AnimalSex}.
 * - `dateOfBirth`, when provided, must be a real `YYYY-MM-DD` date and not in the
 *   future (compared against `today`, a `YYYY-MM-DD` string). Blank is dropped.
 * - `mutation` and `treatmentGroup` are trimmed; blanks are dropped (kept as
 *   free text — never constrained to a fixed set of groups).
 *
 * Throws {@link ValidationError} (with the offending field) on the first problem.
 */
export function validateAnimalFields(
  input: AnimalFieldsInput,
  today: string,
): ValidatedAnimalFields {
  const animalIdentifier = (input.animalIdentifier ?? "").trim();
  if (animalIdentifier.length === 0) {
    throw new ValidationError("Please enter an animal ID.", "animalIdentifier");
  }

  const sex = input.sex ?? "unknown";
  if (!isAnimalSex(sex)) {
    throw new ValidationError("Please choose a valid sex.", "sex");
  }

  const dateOfBirth = (input.dateOfBirth ?? "").trim();
  if (dateOfBirth.length > 0) {
    if (!isValidDateOnly(dateOfBirth)) {
      throw new ValidationError(
        "Please enter a valid date of birth (year-month-day).",
        "dateOfBirth",
      );
    }
    if (dateOfBirth > today) {
      throw new ValidationError(
        "Date of birth can't be in the future.",
        "dateOfBirth",
      );
    }
  }

  const mutation = (input.mutation ?? "").trim();
  const treatmentGroup = (input.treatmentGroup ?? "").trim();

  return {
    animalIdentifier,
    sex,
    ...(dateOfBirth.length > 0 ? { dateOfBirth } : {}),
    ...(mutation.length > 0 ? { mutation } : {}),
    ...(treatmentGroup.length > 0 ? { treatmentGroup } : {}),
  };
}
