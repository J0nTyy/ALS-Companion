import type {
  NewTimelineEventInput,
  TimelineEvent,
} from "@/domain/entities/timeline-event";
import type { TimelineEventUseCaseDeps } from "./deps";
import { loadWritableAnimal } from "./load-writable-animal";
import { validateTimelineEventFields } from "./validate-timeline-event-input";

/**
 * Add a new timeline event to an animal's experiment timeline.
 *
 * Verifies the animal exists, belongs to the given study, and that the study is
 * not archived; validates the fields; generates id/timestamps via injected
 * services; persists; and returns the entity.
 */
export async function createTimelineEvent(
  deps: TimelineEventUseCaseDeps,
  input: NewTimelineEventInput,
): Promise<TimelineEvent> {
  await loadWritableAnimal(deps, input.animalId, input.studyId);

  const fields = validateTimelineEventFields(input);
  const now = deps.clock.now();

  const event: TimelineEvent = {
    id: deps.ids.next(),
    animalId: input.animalId,
    title: fields.title,
    category: fields.category,
    status: fields.status,
    createdAt: now,
    updatedAt: now,
    ...(fields.plannedDate !== undefined
      ? { plannedDate: fields.plannedDate }
      : {}),
    ...(fields.completedDate !== undefined
      ? { completedDate: fields.completedDate }
      : {}),
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.repository.create(event);
  return event;
}
