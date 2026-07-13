import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";
import type { BiomarkerUseCaseDeps } from "./deps";

/** List a timeline event's biomarker samples, most-recently collected first. */
export async function listBiomarkerSamples(
  deps: BiomarkerUseCaseDeps,
  timelineEventId: string,
): Promise<BiomarkerSample[]> {
  return deps.samples.listByTimelineEvent(timelineEventId);
}
