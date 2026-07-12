import type {
  NewTimelineEventInput,
  TimelineEvent,
  UpdateTimelineEventInput,
} from "@/domain/entities/timeline-event";
import type { TimelineEventUseCaseDeps } from "@/application/use-cases/deps";
import { createTimelineEvent } from "@/application/use-cases/create-timeline-event";
import { updateTimelineEvent } from "@/application/use-cases/update-timeline-event";
import { listTimelineEvents } from "@/application/use-cases/list-timeline-events";
import { getTimelineEvent } from "@/application/use-cases/get-timeline-event";

/**
 * Facade the presentation layer depends on for timeline-event operations. Hides
 * the use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL.
 */
export interface TimelineEventsService {
  listByAnimal(animalId: string): Promise<TimelineEvent[]>;
  get(id: string): Promise<TimelineEvent | null>;
  create(input: NewTimelineEventInput): Promise<TimelineEvent>;
  update(input: UpdateTimelineEventInput): Promise<TimelineEvent>;
}

/** Bind a dependency bundle to the timeline-event use cases to produce a service. */
export function createTimelineEventsService(
  deps: TimelineEventUseCaseDeps,
): TimelineEventsService {
  return {
    listByAnimal: (animalId) => listTimelineEvents(deps, animalId),
    get: (id) => getTimelineEvent(deps, id),
    create: (input) => createTimelineEvent(deps, input),
    update: (input) => updateTimelineEvent(deps, input),
  };
}
