/**
 * Domain entity: BiomarkerSample
 * ----------------------------------------------------------------------------
 * A biological sample collected for molecular / biochemical analysis, attached to
 * one {@link TimelineEvent} (typically a "biochemical_analysis" event). A sample is
 * the LABORATORY-EVIDENCE parent of one or more {@link BiomarkerResult}s — the raw
 * values a lab reported for it. Framework-free: no React, SQLite, or Tauri.
 *
 * This milestone CAPTURES measurements; it does not analyze them (no statistics,
 * graphing, normalization, or AI). Future statistics / cohort / AI features must
 * CONSUME these records, not re-parse free text.
 *
 * `sampleType` is a small extensible union; adding a type later is a one-line change
 * to `BIOMARKER_SAMPLE_TYPES` (+ its META) — everything keys off the derived type.
 */

export const BIOMARKER_SAMPLE_TYPES = [
  "blood",
  "csf",
  "spinal_cord",
  "brain_tissue",
  "muscle",
  "other",
] as const;

export type BiomarkerSampleType = (typeof BIOMARKER_SAMPLE_TYPES)[number];

export interface BiomarkerSample {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The timeline event this sample belongs to. */
  readonly timelineEventId: string;
  /** What kind of sample this is (extensible union). */
  sampleType: BiomarkerSampleType;
  /** The day the sample was collected, as a local `YYYY-MM-DD` string. */
  collectionDate: string;
  /** Optional operator/technician who collected or processed the sample. */
  operator?: string;
  /** Optional free-text research context. Never a diagnosis or disease stage. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when creating a sample. */
export type NewBiomarkerSampleInput = Pick<
  BiomarkerSample,
  "timelineEventId" | "sampleType" | "collectionDate"
> &
  Partial<Pick<BiomarkerSample, "operator" | "notes">>;

/** Fields a researcher can change when editing a sample. */
export type UpdateBiomarkerSampleInput = Pick<
  BiomarkerSample,
  "id" | "sampleType" | "collectionDate"
> &
  Partial<Pick<BiomarkerSample, "operator" | "notes">>;

/** User-facing labels for each sample type (researcher terminology). */
export const BIOMARKER_SAMPLE_TYPE_META: Record<
  BiomarkerSampleType,
  { label: string }
> = {
  blood: { label: "Blood" },
  csf: { label: "CSF" },
  spinal_cord: { label: "Spinal Cord" },
  brain_tissue: { label: "Brain Tissue" },
  muscle: { label: "Muscle" },
  other: { label: "Other" },
};

export function isBiomarkerSampleType(
  value: unknown,
): value is BiomarkerSampleType {
  return (
    typeof value === "string" &&
    (BIOMARKER_SAMPLE_TYPES as readonly string[]).includes(value)
  );
}
