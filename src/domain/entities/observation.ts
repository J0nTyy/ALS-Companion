/**
 * Domain entity: Observation
 * ----------------------------------------------------------------------------
 * A single longitudinal measurement recorded for one {@link Animal} on a given
 * day — a body weight (grams) or a motor assessment (a score on a named scale).
 * Framework-free: no React, SQLite, or Tauri.
 *
 * This is a research record-keeping model, NOT a diagnostic or disease-staging
 * tool. Notes are free-text context only.
 */

export const OBSERVATION_KINDS = ["body_weight", "motor_score"] as const;

export type ObservationKind = (typeof OBSERVATION_KINDS)[number];

export interface Observation {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The animal this observation belongs to. */
  readonly animalId: string;
  /** The day the measurement was taken, as a local `YYYY-MM-DD` string. */
  observedOn: string;
  /** What was measured. */
  kind: ObservationKind;
  /** Body weight in grams, or the motor score value. */
  value: number;
  /**
   * The named scoring scale for a motor assessment (e.g. a hindlimb 0–5 score).
   * Required when `kind` is "motor_score"; absent for body weight. Kept as free
   * text so any scale can be used without code changes.
   */
  scaleName?: string;
  /** Optional free-text research context. Never a diagnosis or disease stage. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when recording an observation. */
export type NewObservationInput = {
  animalId: string;
  /** The study context the animal is expected to belong to (integrity check). */
  studyId: string;
  kind: ObservationKind;
  observedOn: string;
  value: number;
} & Partial<Pick<Observation, "scaleName" | "notes">>;

/** Fields a researcher can change when editing an observation. */
export type UpdateObservationInput = Pick<
  Observation,
  "id" | "kind" | "observedOn" | "value"
> &
  Partial<Pick<Observation, "scaleName" | "notes">>;

/** User-facing presentation metadata for each kind. */
export const OBSERVATION_KIND_META: Record<
  ObservationKind,
  {
    label: string;
    /** Label for the numeric value input. */
    valueLabel: string;
    /** Fixed unit shown to the researcher, if any. */
    unit?: string;
    /** Whether a named scale is required. */
    requiresScale: boolean;
  }
> = {
  body_weight: {
    label: "Body weight",
    valueLabel: "Weight",
    unit: "g",
    requiresScale: false,
  },
  motor_score: {
    label: "Motor assessment",
    valueLabel: "Score",
    requiresScale: true,
  },
};

export function isObservationKind(value: unknown): value is ObservationKind {
  return (
    typeof value === "string" &&
    (OBSERVATION_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Whether `value` is acceptable for `kind`: always finite; body weight must be
 * strictly positive (grams), motor scores must be non-negative. Shared by input
 * validation and by row mapping so the rule is defined once.
 */
export function isValidObservationValue(
  kind: ObservationKind,
  value: number,
): boolean {
  if (!Number.isFinite(value)) return false;
  return kind === "body_weight" ? value > 0 : value >= 0;
}
