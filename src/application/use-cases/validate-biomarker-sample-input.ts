import {
  isBiomarkerSampleType,
  type BiomarkerSampleType,
} from "@/domain/entities/biomarker-sample";
import { isValidDateOnly } from "@/domain/value-objects/date-only";
import { ValidationError } from "@/application/errors";

/** Raw fields coming from a form. */
export interface BiomarkerSampleFieldsInput {
  sampleType?: string;
  collectionDate?: string;
  operator?: string;
  notes?: string;
}

/** Clean, validated fields ready to build a {@link BiomarkerSample}. */
export interface ValidatedBiomarkerSampleFields {
  sampleType: BiomarkerSampleType;
  collectionDate: string;
  operator?: string;
  notes?: string;
}

/**
 * Validate and normalize a biomarker sample's fields.
 *
 * - `sampleType` must be a known type (default "blood").
 * - `collectionDate` must be a real `YYYY-MM-DD` date.
 * - `operator` and `notes` are trimmed; blanks are dropped.
 */
export function validateBiomarkerSampleFields(
  input: BiomarkerSampleFieldsInput,
): ValidatedBiomarkerSampleFields {
  const sampleType = input.sampleType ?? "blood";
  if (!isBiomarkerSampleType(sampleType)) {
    throw new ValidationError("Please choose a valid sample type.", "sampleType");
  }

  const collectionDate = (input.collectionDate ?? "").trim();
  if (!isValidDateOnly(collectionDate)) {
    throw new ValidationError(
      "Please enter a valid collection date (year-month-day).",
      "collectionDate",
    );
  }

  const operator = (input.operator ?? "").trim();
  const notes = (input.notes ?? "").trim();

  return {
    sampleType,
    collectionDate,
    ...(operator.length > 0 ? { operator } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
