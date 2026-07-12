/**
 * Domain entity: MRISession
 * ----------------------------------------------------------------------------
 * An imaging session attached to one {@link TimelineEvent} (typically a timeline
 * event of category "mri"). This milestone stores session **metadata only** — no
 * image files, viewer, annotations, ROI, or AI. Framework-free: no React, SQLite,
 * or Tauri.
 *
 * It is the root of the future imaging chain:
 *   TimelineEvent → MRISession → MRI Images → Annotations → Measurements → AI.
 * Later subsystems attach to an MRISession `id`; they never replace this model.
 *
 * `modality` is a small extensible union. Only "mri" exists today, but adding a
 * future modality (e.g. DTI, PET) is a one-line change to `MRI_MODALITIES` — no
 * redesign — because everything keys off the derived union type.
 */

export const MRI_MODALITIES = ["mri"] as const;

export type MriModality = (typeof MRI_MODALITIES)[number];

export interface MRISession {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The timeline event this session belongs to. */
  readonly timelineEventId: string;
  /** Short researcher-facing title, e.g. "Baseline brain MRI". */
  title: string;
  /** Imaging modality (extensible; "mri" today). */
  modality: MriModality;
  /** The day the scan was acquired, as a local `YYYY-MM-DD` string. */
  acquisitionDate: string;
  /** Optional anatomical region, e.g. "Brain", "Lumbar spinal cord". */
  anatomicalRegion?: string;
  /** Optional operator/technician who acquired the scan. */
  operator?: string;
  /** Optional free-text research context. Never a diagnosis or disease stage. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when creating a session. */
export type NewMriSessionInput = Pick<
  MRISession,
  "timelineEventId" | "title" | "modality" | "acquisitionDate"
> &
  Partial<Pick<MRISession, "anatomicalRegion" | "operator" | "notes">>;

/** Fields a researcher can change when editing a session. */
export type UpdateMriSessionInput = Pick<
  MRISession,
  "id" | "title" | "modality" | "acquisitionDate"
> &
  Partial<Pick<MRISession, "anatomicalRegion" | "operator" | "notes">>;

/** User-facing labels for each modality. */
export const MRI_MODALITY_META: Record<MriModality, { label: string }> = {
  mri: { label: "MRI" },
};

export function isMriModality(value: unknown): value is MriModality {
  return (
    typeof value === "string" &&
    (MRI_MODALITIES as readonly string[]).includes(value)
  );
}
