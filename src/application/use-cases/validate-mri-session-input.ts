import {
  isMriModality,
  type MriModality,
} from "@/domain/entities/mri-session";
import { isValidDateOnly } from "@/domain/value-objects/date-only";
import { ValidationError } from "@/application/errors";

/** Raw fields coming from a form. */
export interface MriSessionFieldsInput {
  title?: string;
  modality?: string;
  acquisitionDate?: string;
  anatomicalRegion?: string;
  operator?: string;
  notes?: string;
}

/** Clean, validated fields ready to build an {@link MRISession}. */
export interface ValidatedMriSessionFields {
  title: string;
  modality: MriModality;
  acquisitionDate: string;
  anatomicalRegion?: string;
  operator?: string;
  notes?: string;
}

/**
 * Validate and normalize an MRI session's fields.
 *
 * - `title` is trimmed and must be non-empty.
 * - `modality` must be a known modality (default "mri").
 * - `acquisitionDate` must be a real `YYYY-MM-DD` date.
 * - `anatomicalRegion`, `operator`, and `notes` are trimmed; blanks are dropped.
 */
export function validateMriSessionFields(
  input: MriSessionFieldsInput,
): ValidatedMriSessionFields {
  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    throw new ValidationError("Please enter a session title.", "title");
  }

  const modality = input.modality ?? "mri";
  if (!isMriModality(modality)) {
    throw new ValidationError("Please choose a valid modality.", "modality");
  }

  const acquisitionDate = (input.acquisitionDate ?? "").trim();
  if (!isValidDateOnly(acquisitionDate)) {
    throw new ValidationError(
      "Please enter a valid acquisition date (year-month-day).",
      "acquisitionDate",
    );
  }

  const anatomicalRegion = (input.anatomicalRegion ?? "").trim();
  const operator = (input.operator ?? "").trim();
  const notes = (input.notes ?? "").trim();

  return {
    title,
    modality,
    acquisitionDate,
    ...(anatomicalRegion.length > 0 ? { anatomicalRegion } : {}),
    ...(operator.length > 0 ? { operator } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
