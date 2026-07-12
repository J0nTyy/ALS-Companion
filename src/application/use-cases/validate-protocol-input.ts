import {
  isTimelineEventCategory,
  type TimelineEventCategory,
} from "@/domain/entities/timeline-event";
import { isValidOffsetDays } from "@/domain/entities/protocol-template";
import { ValidationError } from "@/application/errors";

/** Validate and normalize a protocol template's name. */
export function validateProtocolName(input: { name?: string }): {
  name: string;
} {
  const name = (input.name ?? "").trim();
  if (name.length === 0) {
    throw new ValidationError("Please enter a protocol name.", "name");
  }
  return { name };
}

/** Raw step fields coming from a form. `offsetDays` is already numeric. */
export interface ProtocolStepFieldsInput {
  title?: string;
  category?: string;
  offsetDays?: number;
  notes?: string;
}

/** Clean, validated step fields. */
export interface ValidatedProtocolStepFields {
  title: string;
  category: TimelineEventCategory;
  offsetDays: number;
  notes?: string;
}

/**
 * Validate and normalize a protocol step's fields.
 *
 * - `title` is trimmed and must be non-empty.
 * - `category` must be a known category (shared with timeline events).
 * - `offsetDays` must be a whole number of days, 0 or more (relative to the
 *   animal's creation date).
 * - `notes` is trimmed; blank is dropped.
 */
export function validateProtocolStepFields(
  input: ProtocolStepFieldsInput,
): ValidatedProtocolStepFields {
  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    throw new ValidationError("Please enter a step title.", "title");
  }

  const category = input.category ?? "";
  if (!isTimelineEventCategory(category)) {
    throw new ValidationError("Please choose a category.", "category");
  }

  const offsetDays = input.offsetDays ?? Number.NaN;
  if (!isValidOffsetDays(offsetDays)) {
    throw new ValidationError(
      "Day offset must be a whole number of days (0 or more).",
      "offsetDays",
    );
  }

  const notes = (input.notes ?? "").trim();

  return {
    title,
    category,
    offsetDays,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
