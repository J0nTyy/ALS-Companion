/**
 * Domain entity: TimelineEvent
 * ----------------------------------------------------------------------------
 * A chronological laboratory-workflow event attached to one {@link Animal} — the
 * backbone of an animal's experiment timeline (gene confirmation, behavioral and
 * neurological assessments, MRI, biochemical analysis, histopathology, or a
 * custom step). Framework-free: no React, SQLite, or Tauri.
 *
 * This is a research workflow-tracking model, NOT a scheduler/calendar and NOT a
 * diagnostic or disease-staging tool. Notes are free-text context only. Timeline
 * history is permanent — there is no delete.
 *
 * Future modules (MRI, histology, blood collection, attachments, AI) are expected
 * to extend an event — e.g. attach files or richer per-category detail keyed by a
 * TimelineEvent `id` — rather than replace this model.
 */

export const TIMELINE_EVENT_CATEGORIES = [
  "gene_confirmation",
  "behavioral_assessment",
  "neurological_examination",
  "mri",
  "biochemical_analysis",
  "histopathology",
  "custom",
] as const;

export type TimelineEventCategory =
  (typeof TIMELINE_EVENT_CATEGORIES)[number];

export const TIMELINE_EVENT_STATUSES = ["planned", "completed"] as const;

export type TimelineEventStatus = (typeof TIMELINE_EVENT_STATUSES)[number];

export interface TimelineEvent {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The animal this event belongs to. */
  readonly animalId: string;
  /** Short researcher-facing title, e.g. "Confirm SOD1 genotype". */
  title: string;
  /** Which kind of workflow step this is. */
  category: TimelineEventCategory;
  /** Where the event sits in its lifecycle. */
  status: TimelineEventStatus;
  /** Optional planned/scheduled day, as a local `YYYY-MM-DD` string. */
  plannedDate?: string;
  /** Optional day the step was completed, as a local `YYYY-MM-DD` string. */
  completedDate?: string;
  /** Optional free-text research context. Never a diagnosis or disease stage. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when adding a timeline event. */
export type NewTimelineEventInput = {
  animalId: string;
  /** The study context the animal is expected to belong to (integrity check). */
  studyId: string;
  title: string;
  category: TimelineEventCategory;
  status: TimelineEventStatus;
} & Partial<Pick<TimelineEvent, "plannedDate" | "completedDate" | "notes">>;

/** Fields a researcher can change when editing a timeline event. */
export type UpdateTimelineEventInput = Pick<
  TimelineEvent,
  "id" | "title" | "category" | "status"
> &
  Partial<Pick<TimelineEvent, "plannedDate" | "completedDate" | "notes">>;

/** User-facing labels for each category (researcher terminology). */
export const TIMELINE_EVENT_CATEGORY_META: Record<
  TimelineEventCategory,
  { label: string }
> = {
  gene_confirmation: { label: "Gene Confirmation" },
  behavioral_assessment: { label: "Behavioral Assessment" },
  neurological_examination: { label: "Neurological Examination" },
  mri: { label: "MRI" },
  biochemical_analysis: { label: "Biochemical Analysis" },
  histopathology: { label: "Histopathology" },
  custom: { label: "Custom" },
};

/** User-facing presentation metadata for each status. */
export const TIMELINE_EVENT_STATUS_META: Record<
  TimelineEventStatus,
  { label: string; tone: "secondary" | "success" }
> = {
  planned: { label: "Planned", tone: "secondary" },
  completed: { label: "Completed", tone: "success" },
};

export function isTimelineEventCategory(
  value: unknown,
): value is TimelineEventCategory {
  return (
    typeof value === "string" &&
    (TIMELINE_EVENT_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isTimelineEventStatus(
  value: unknown,
): value is TimelineEventStatus {
  return (
    typeof value === "string" &&
    (TIMELINE_EVENT_STATUSES as readonly string[]).includes(value)
  );
}
