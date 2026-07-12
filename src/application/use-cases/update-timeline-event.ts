import type {
  TimelineEvent,
  UpdateTimelineEventInput,
} from "@/domain/entities/timeline-event";
import { NotFoundError } from "@/application/errors";
import type { TimelineEventUseCaseDeps } from "./deps";
import { loadWritableAnimal } from "./load-writable-animal";
import { validateTimelineEventFields } from "./validate-timeline-event-input";

/**
 * Apply researcher edits to an existing timeline event (also used to "mark
 * complete", which is an update with status = "completed").
 *
 * Loads the event (preserving its animal and creation time), verifies the parent
 * animal's study is still writable (exists and not archived — closing the
 * archive-while-editing race), validates the fields, refreshes the modification
 * time, and persists. Clearing an optional field removes it.
 */
export async function updateTimelineEvent(
  deps: TimelineEventUseCaseDeps,
  input: UpdateTimelineEventInput,
): Promise<TimelineEvent> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That timeline event could not be found.");
  }

  await loadWritableAnimal(deps, existing.animalId);

  const fields = validateTimelineEventFields(input);

  const updated: TimelineEvent = {
    ...existing,
    title: fields.title,
    category: fields.category,
    status: fields.status,
    updatedAt: deps.clock.now(),
  };

  if (fields.plannedDate !== undefined) {
    updated.plannedDate = fields.plannedDate;
  } else {
    delete updated.plannedDate;
  }
  if (fields.completedDate !== undefined) {
    updated.completedDate = fields.completedDate;
  } else {
    delete updated.completedDate;
  }
  if (fields.notes !== undefined) {
    updated.notes = fields.notes;
  } else {
    delete updated.notes;
  }

  await deps.repository.update(updated);
  return updated;
}
