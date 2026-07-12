import type { MRISession } from "@/domain/entities/mri-session";
import type { MriSessionUseCaseDeps } from "./deps";

/** List a timeline event's MRI sessions, most-recently acquired first. */
export async function listMriSessions(
  deps: MriSessionUseCaseDeps,
  timelineEventId: string,
): Promise<MRISession[]> {
  return deps.repository.listByTimelineEvent(timelineEventId);
}
