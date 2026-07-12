import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import { NotFoundError } from "@/application/errors";
import { loadWritableAnimal } from "./load-writable-animal";

/**
 * Load a timeline event and confirm it can be written to (used before creating or
 * editing an MRI session attached to it).
 *
 * Walks the parent chain: the timeline event must exist, its animal must exist,
 * and the animal's study must not be archived.
 *
 * @throws NotFoundError if the timeline event (or its animal) is missing.
 * @throws StudyArchivedError if the animal's study is archived.
 */
export async function loadWritableTimelineEvent(
  deps: {
    timelineEvents: TimelineEventReader;
    animals: AnimalReader;
    studies: StudyReader;
  },
  timelineEventId: string,
): Promise<TimelineEvent> {
  const event = await deps.timelineEvents.getById(timelineEventId);
  if (!event) {
    throw new NotFoundError("That timeline event could not be found.");
  }
  await loadWritableAnimal(deps, event.animalId);
  return event;
}
