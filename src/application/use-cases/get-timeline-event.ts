import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { TimelineEventUseCaseDeps } from "./deps";

/** Fetch a single timeline event by id, or null when it does not exist. */
export async function getTimelineEvent(
  deps: TimelineEventUseCaseDeps,
  id: string,
): Promise<TimelineEvent | null> {
  return deps.repository.getById(id);
}
