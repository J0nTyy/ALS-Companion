import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";
import type { BiomarkerSampleReader } from "@/application/ports/biomarker-sample-repository";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import { NotFoundError } from "@/application/errors";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";

/**
 * Load a biomarker sample and confirm it can be written to (used before creating,
 * editing, or deleting a result on it). Walks the parent chain
 * `BiomarkerSample → TimelineEvent → Animal → Study`: the sample must exist and the
 * owning study must not be archived.
 *
 * @throws NotFoundError if the sample (or a parent in its chain) is missing.
 * @throws StudyArchivedError if the owning study is archived.
 */
export async function loadWritableBiomarkerSample(
  deps: {
    samples: BiomarkerSampleReader;
    timelineEvents: TimelineEventReader;
    animals: AnimalReader;
    studies: StudyReader;
  },
  sampleId: string,
): Promise<BiomarkerSample> {
  const sample = await deps.samples.getById(sampleId);
  if (!sample) {
    throw new NotFoundError("That biomarker sample could not be found.");
  }
  await loadWritableTimelineEvent(deps, sample.timelineEventId);
  return sample;
}
