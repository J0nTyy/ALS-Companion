import type {
  BiomarkerSample,
  UpdateBiomarkerSampleInput,
} from "@/domain/entities/biomarker-sample";
import { NotFoundError } from "@/application/errors";
import type { BiomarkerUseCaseDeps } from "./deps";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";
import { validateBiomarkerSampleFields } from "./validate-biomarker-sample-input";

/**
 * Apply researcher edits to an existing biomarker sample.
 *
 * Loads the sample (preserving its timeline event and creation time), verifies the
 * study is still writable (exists and not archived), validates the fields, refreshes
 * the modification time, and persists. Clearing an optional field removes it.
 */
export async function updateBiomarkerSample(
  deps: BiomarkerUseCaseDeps,
  input: UpdateBiomarkerSampleInput,
): Promise<BiomarkerSample> {
  const existing = await deps.samples.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That biomarker sample could not be found.");
  }

  await loadWritableTimelineEvent(deps, existing.timelineEventId);

  const fields = validateBiomarkerSampleFields(input);

  const updated: BiomarkerSample = {
    ...existing,
    sampleType: fields.sampleType,
    collectionDate: fields.collectionDate,
    updatedAt: deps.clock.now(),
  };

  if (fields.operator !== undefined) {
    updated.operator = fields.operator;
  } else {
    delete updated.operator;
  }
  if (fields.notes !== undefined) {
    updated.notes = fields.notes;
  } else {
    delete updated.notes;
  }

  await deps.samples.update(updated);
  return updated;
}
