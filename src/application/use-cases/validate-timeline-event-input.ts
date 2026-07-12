import {
  isTimelineEventCategory,
  isTimelineEventStatus,
  type TimelineEventCategory,
  type TimelineEventStatus,
} from "@/domain/entities/timeline-event";
import { isValidDateOnly } from "@/domain/value-objects/date-only";
import { ValidationError } from "@/application/errors";

/** Raw fields coming from a form. */
export interface TimelineEventFieldsInput {
  title?: string;
  category?: string;
  status?: string;
  plannedDate?: string;
  completedDate?: string;
  notes?: string;
}

/** Clean, validated fields ready to build a {@link TimelineEvent}. */
export interface ValidatedTimelineEventFields {
  title: string;
  category: TimelineEventCategory;
  status: TimelineEventStatus;
  plannedDate?: string;
  completedDate?: string;
  notes?: string;
}

/**
 * Validate and normalize a timeline event's fields.
 *
 * - `title` is trimmed and must be non-empty.
 * - `category` must be a known category; `status` a known status (default
 *   "planned").
 * - `plannedDate`/`completedDate`, when provided, must be real `YYYY-MM-DD`
 *   dates. They are **not** checked against "today" — a planned event is
 *   legitimately in the future. Blank dates are dropped.
 * - `notes` is trimmed; blank is dropped.
 *
 * Throws {@link ValidationError} (with the offending field) on the first problem.
 */
export function validateTimelineEventFields(
  input: TimelineEventFieldsInput,
): ValidatedTimelineEventFields {
  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    throw new ValidationError("Please enter a title for this event.", "title");
  }

  const category = input.category ?? "";
  if (!isTimelineEventCategory(category)) {
    throw new ValidationError("Please choose a category.", "category");
  }

  const status = input.status ?? "planned";
  if (!isTimelineEventStatus(status)) {
    throw new ValidationError("Please choose a valid status.", "status");
  }

  const plannedDate = (input.plannedDate ?? "").trim();
  if (plannedDate.length > 0 && !isValidDateOnly(plannedDate)) {
    throw new ValidationError(
      "Please enter a valid planned date (year-month-day).",
      "plannedDate",
    );
  }

  const completedDate = (input.completedDate ?? "").trim();
  if (completedDate.length > 0 && !isValidDateOnly(completedDate)) {
    throw new ValidationError(
      "Please enter a valid completed date (year-month-day).",
      "completedDate",
    );
  }

  const notes = (input.notes ?? "").trim();

  return {
    title,
    category,
    status,
    ...(plannedDate.length > 0 ? { plannedDate } : {}),
    ...(completedDate.length > 0 ? { completedDate } : {}),
    ...(notes.length > 0 ? { notes } : {}),
  };
}
