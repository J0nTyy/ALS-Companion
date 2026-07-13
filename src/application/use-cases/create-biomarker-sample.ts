import type {
  BiomarkerSample,
  NewBiomarkerSampleInput,
} from "@/domain/entities/biomarker-sample";
import type { BiomarkerUseCaseDeps } from "./deps";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";
import { validateBiomarkerSampleFields } from "./validate-biomarker-sample-input";

/**
 * Create a biomarker sample attached to a timeline event.
 *
 * Verifies the parent timeline event exists and its study is not archived,
 * validates the fields, generates id/timestamps via injected services, persists,
 * and returns the entity.
 */
export async function createBiomarkerSample(
  deps: BiomarkerUseCaseDeps,
  input: NewBiomarkerSampleInput,
): Promise<BiomarkerSample> {
  await loadWritableTimelineEvent(deps, input.timelineEventId);

  const fields = validateBiomarkerSampleFields(input);
  const now = deps.clock.now();

  const sample: BiomarkerSample = {
    id: deps.ids.next(),
    timelineEventId: input.timelineEventId,
    sampleType: fields.sampleType,
    collectionDate: fields.collectionDate,
    createdAt: now,
    updatedAt: now,
    ...(fields.operator !== undefined ? { operator: fields.operator } : {}),
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.samples.create(sample);
  return sample;
}
