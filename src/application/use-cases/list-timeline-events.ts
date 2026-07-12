import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { TimelineEventUseCaseDeps } from "./deps";

/** List an animal's timeline events, most-recent activity first. */
export async function listTimelineEvents(
  deps: TimelineEventUseCaseDeps,
  animalId: string,
): Promise<TimelineEvent[]> {
  return deps.repository.listByAnimal(animalId);
}
