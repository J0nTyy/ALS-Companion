import type { HistologySession } from "@/domain/entities/histology-session";
import type { HistologySessionUseCaseDeps } from "./deps";

/** List a timeline event's histology sessions, most-recently acquired first. */
export async function listHistologySessions(
  deps: HistologySessionUseCaseDeps,
  timelineEventId: string,
): Promise<HistologySession[]> {
  return deps.repository.listByTimelineEvent(timelineEventId);
}
