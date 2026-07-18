/**
 * Domain entity: Study
 * ----------------------------------------------------------------------------
 * A Study is the top-level container for a research effort — a cohort of
 * transgenic mice observed over time under a protocol. This module defines the
 * shape and invariants of a Study with no dependency on React, SQLite, or Tauri
 * so the model can be reasoned about and tested in isolation.
 */

export const STUDY_STATUSES = [
  "planning",
  "active",
  "completed",
  "archived",
] as const;

export type StudyStatus = (typeof STUDY_STATUSES)[number];

export interface Study {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** Human-readable study name, e.g. "SOD1-G93A survival cohort". */
  name: string;
  /** Optional free-text summary of the study's purpose. */
  description?: string;
  /** Transgenic line under study, e.g. "SOD1-G93A". */
  strain: string;
  /** Where the study sits in its lifecycle. */
  status: StudyStatus;
  /**
   * Optional narrative report summary, included in exports (PDF/DOCX/JSON). Set via
   * the AI assistant or the Publish workspace — not the study form — so a normal
   * study edit preserves it. (Migration v14.)
   */
  summary?: string;
  /**
   * ISO-8601 timestamp of when {@link summary} was last saved. Used to show "last
   * saved" and to anchor the assistant's "update since the last report" draft.
   * Present only when a summary is set. (Migration v15.)
   */
  summaryUpdatedAt?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when creating a study. */
export type NewStudyInput = Pick<Study, "name" | "strain"> &
  Partial<Pick<Study, "description" | "status">>;

/** Fields a researcher can change when editing an existing study. */
export type UpdateStudyInput = Pick<
  Study,
  "id" | "name" | "strain" | "status"
> &
  Partial<Pick<Study, "description">>;

/** User-facing presentation metadata for each status. */
export const STUDY_STATUS_META: Record<
  StudyStatus,
  { label: string; tone: "default" | "success" | "secondary" | "warning" }
> = {
  planning: { label: "Planning", tone: "secondary" },
  active: { label: "Active", tone: "success" },
  completed: { label: "Completed", tone: "default" },
  archived: { label: "Archived", tone: "warning" },
};

export function isStudyStatus(value: unknown): value is StudyStatus {
  return (
    typeof value === "string" &&
    (STUDY_STATUSES as readonly string[]).includes(value)
  );
}
