import {
  isObservationKind,
  isValidObservationValue,
  type ObservationKind,
} from "@/domain/entities/observation";
import { isValidDateOnly } from "@/domain/value-objects/date-only";
import { ValidationError } from "@/application/errors";

/** Raw fields coming from a form. `value` is already numeric (NaN if blank). */
export interface ObservationFieldsInput {
  kind?: string;
  observedOn?: string;
  value?: number;
  scaleName?: string;
  notes?: string;
}

/** Clean, validated fields ready to build an {@link Observation}. */
export interface ValidatedObservationFields {
  kind: ObservationKind;
  observedOn: string;
  value: number;
  /** Present (and required) only for motor scores. */
  scaleName?: string;
  notes?: string;
}

/**
 * Validate and normalize an observation's fields.
 *
 * - `kind` must be a known {@link ObservationKind}.
 * - `observedOn` must be a real `YYYY-MM-DD` date and not after `today` (the
 *   researcher's local day, passed in).
 * - `value` must be finite; body weight strictly positive (grams), motor score
 *   non-negative.
 * - motor scores require a non-empty `scaleName`; body weight drops it.
 * - `notes` is trimmed; blank is dropped.
 *
 * Throws {@link ValidationError} (with the offending field) on the first problem.
 */
export function validateObservationFields(
  input: ObservationFieldsInput,
  today: string,
): ValidatedObservationFields {
  const kind = input.kind ?? "";
  if (!isObservationKind(kind)) {
    throw new ValidationError("Please choose what you measured.", "kind");
  }

  const observedOn = (input.observedOn ?? "").trim();
  if (!isValidDateOnly(observedOn)) {
    throw new ValidationError(
      "Please enter a valid observation date (year-month-day).",
      "observedOn",
    );
  }
  if (observedOn > today) {
    throw new ValidationError(
      "The observation date can't be in the future.",
      "observedOn",
    );
  }

  const value = input.value ?? Number.NaN;
  if (!Number.isFinite(value)) {
    throw new ValidationError("Please enter a number.", "value");
  }
  if (!isValidObservationValue(kind, value)) {
    throw new ValidationError(
      kind === "body_weight"
        ? "Body weight must be greater than 0 grams."
        : "A motor score can't be negative.",
      "value",
    );
  }

  const notes = (input.notes ?? "").trim();

  if (kind === "motor_score") {
    const scaleName = (input.scaleName ?? "").trim();
    if (scaleName.length === 0) {
      throw new ValidationError(
        "Please name the scale you used, so the score stays interpretable.",
        "scaleName",
      );
    }
    return {
      kind,
      observedOn,
      value,
      scaleName,
      ...(notes.length > 0 ? { notes } : {}),
    };
  }

  // Body weight: no scale.
  return {
    kind,
    observedOn,
    value,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
