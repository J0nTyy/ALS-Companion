import { ValidationError } from "@/application/errors";

/** Raw fields coming from a form. */
export interface BiomarkerResultFieldsInput {
  biomarkerName?: string;
  value?: string;
  unit?: string;
  method?: string;
  notes?: string;
}

/** Clean, validated fields ready to build a {@link BiomarkerResult}. */
export interface ValidatedBiomarkerResultFields {
  biomarkerName: string;
  value: string;
  unit?: string;
  method?: string;
  notes?: string;
}

/**
 * Validate and normalize a biomarker result's fields.
 *
 * - `biomarkerName` is trimmed and required (free text — any biomarker).
 * - `value` is trimmed and required, stored verbatim (never parsed/normalized), so
 *   qualitative readouts like "< 0.05" or "not detected" are preserved.
 * - `unit`, `method`, and `notes` are trimmed; blanks are dropped.
 */
export function validateBiomarkerResultFields(
  input: BiomarkerResultFieldsInput,
): ValidatedBiomarkerResultFields {
  const biomarkerName = (input.biomarkerName ?? "").trim();
  if (biomarkerName.length === 0) {
    throw new ValidationError(
      "Please enter the biomarker name.",
      "biomarkerName",
    );
  }

  const value = (input.value ?? "").trim();
  if (value.length === 0) {
    throw new ValidationError("Please enter the measured value.", "value");
  }

  const unit = (input.unit ?? "").trim();
  const method = (input.method ?? "").trim();
  const notes = (input.notes ?? "").trim();

  return {
    biomarkerName,
    value,
    ...(unit.length > 0 ? { unit } : {}),
    ...(method.length > 0 ? { method } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
