/**
 * Domain entity: BiomarkerResult
 * ----------------------------------------------------------------------------
 * A single laboratory value reported for a {@link BiomarkerSample} — e.g.
 * "Neurofilament Light (NfL) = 45.2 pg/mL by ELISA". A sample has zero or more
 * results (one-to-many). Framework-free: no React, SQLite, or Tauri.
 *
 * `biomarkerName` is FREE TEXT (required) so the architecture allows UNLIMITED
 * biomarkers — {@link COMMON_BIOMARKERS} is only a suggestion list for the UI, never
 * a closed enum. `value` is stored VERBATIM as text (not a number) so qualitative
 * readouts ("< 0.05", "not detected", "below LOD") are captured faithfully — this
 * milestone records lab evidence and deliberately does NOT normalize or analyze it.
 *
 * Note: results carry only a creation timestamp (no `updatedAt`) — see Migration v13.
 */

/**
 * Suggested biomarker names shown in the entry UI (e.g. a datalist). NOT a closed
 * set — any biomarker name may be entered. Extend freely.
 */
export const COMMON_BIOMARKERS = [
  "Neurofilament Light (NfL)",
  "SOD1",
  "TDP-43",
  "GFAP",
  "IL-6",
  "TNF-α",
  "Oxidative Stress",
] as const;

export interface BiomarkerResult {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The sample this result belongs to. */
  readonly biomarkerSampleId: string;
  /** The biomarker measured — free text (unlimited). */
  biomarkerName: string;
  /** The reported value, stored verbatim as text (never normalized). */
  value: string;
  /** Optional unit, e.g. "pg/mL". */
  unit?: string;
  /** Optional assay/method, e.g. "ELISA", "Western blot", "qPCR". */
  method?: string;
  /** Optional free-text research context. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
}

/** Fields a researcher provides when adding a result. */
export type NewBiomarkerResultInput = Pick<
  BiomarkerResult,
  "biomarkerSampleId" | "biomarkerName" | "value"
> &
  Partial<Pick<BiomarkerResult, "unit" | "method" | "notes">>;

/** Fields a researcher can change when editing a result. */
export type UpdateBiomarkerResultInput = Pick<
  BiomarkerResult,
  "id" | "biomarkerName" | "value"
> &
  Partial<Pick<BiomarkerResult, "unit" | "method" | "notes">>;
