import {
  isHistologyStain,
  type HistologyStain,
} from "@/domain/entities/histology-session";
import { isValidDateOnly } from "@/domain/value-objects/date-only";
import { ValidationError } from "@/application/errors";

/** Raw fields coming from a form. */
export interface HistologySessionFieldsInput {
  stain?: string;
  acquisitionDate?: string;
  tissue?: string;
  magnification?: string;
  operator?: string;
  notes?: string;
}

/** Clean, validated fields ready to build a {@link HistologySession}. */
export interface ValidatedHistologySessionFields {
  stain: HistologyStain;
  acquisitionDate: string;
  tissue?: string;
  magnification?: string;
  operator?: string;
  notes?: string;
}

/**
 * Validate and normalize a histology session's fields.
 *
 * - `stain` must be a known stain (default "he").
 * - `acquisitionDate` must be a real `YYYY-MM-DD` date.
 * - `tissue`, `magnification`, `operator`, and `notes` are trimmed; blanks dropped.
 */
export function validateHistologySessionFields(
  input: HistologySessionFieldsInput,
): ValidatedHistologySessionFields {
  const stain = input.stain ?? "he";
  if (!isHistologyStain(stain)) {
    throw new ValidationError("Please choose a valid stain.", "stain");
  }

  const acquisitionDate = (input.acquisitionDate ?? "").trim();
  if (!isValidDateOnly(acquisitionDate)) {
    throw new ValidationError(
      "Please enter a valid acquisition date (year-month-day).",
      "acquisitionDate",
    );
  }

  const tissue = (input.tissue ?? "").trim();
  const magnification = (input.magnification ?? "").trim();
  const operator = (input.operator ?? "").trim();
  const notes = (input.notes ?? "").trim();

  return {
    stain,
    acquisitionDate,
    ...(tissue.length > 0 ? { tissue } : {}),
    ...(magnification.length > 0 ? { magnification } : {}),
    ...(operator.length > 0 ? { operator } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
