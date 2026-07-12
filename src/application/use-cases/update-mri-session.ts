import type {
  MRISession,
  UpdateMriSessionInput,
} from "@/domain/entities/mri-session";
import { NotFoundError } from "@/application/errors";
import type { MriSessionUseCaseDeps } from "./deps";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";
import { validateMriSessionFields } from "./validate-mri-session-input";

/**
 * Apply researcher edits to an existing MRI session.
 *
 * Loads the session (preserving its timeline event and creation time), verifies
 * the parent timeline event's study is still writable (exists and not archived),
 * validates the fields, refreshes the modification time, and persists. Clearing an
 * optional field removes it.
 */
export async function updateMriSession(
  deps: MriSessionUseCaseDeps,
  input: UpdateMriSessionInput,
): Promise<MRISession> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That MRI session could not be found.");
  }

  await loadWritableTimelineEvent(deps, existing.timelineEventId);

  const fields = validateMriSessionFields(input);

  const updated: MRISession = {
    ...existing,
    title: fields.title,
    modality: fields.modality,
    acquisitionDate: fields.acquisitionDate,
    updatedAt: deps.clock.now(),
  };

  if (fields.anatomicalRegion !== undefined) {
    updated.anatomicalRegion = fields.anatomicalRegion;
  } else {
    delete updated.anatomicalRegion;
  }
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

  await deps.repository.update(updated);
  return updated;
}
