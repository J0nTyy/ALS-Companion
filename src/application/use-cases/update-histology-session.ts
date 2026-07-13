import type {
  HistologySession,
  UpdateHistologySessionInput,
} from "@/domain/entities/histology-session";
import { NotFoundError } from "@/application/errors";
import type { HistologySessionUseCaseDeps } from "./deps";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";
import { validateHistologySessionFields } from "./validate-histology-session-input";

/**
 * Apply researcher edits to an existing histology session.
 *
 * Loads the session (preserving its timeline event and creation time), verifies the
 * parent timeline event's study is still writable (exists and not archived),
 * validates the fields, refreshes the modification time, and persists. Clearing an
 * optional field removes it.
 */
export async function updateHistologySession(
  deps: HistologySessionUseCaseDeps,
  input: UpdateHistologySessionInput,
): Promise<HistologySession> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That histology session could not be found.");
  }

  await loadWritableTimelineEvent(deps, existing.timelineEventId);

  const fields = validateHistologySessionFields(input);

  const updated: HistologySession = {
    ...existing,
    stain: fields.stain,
    acquisitionDate: fields.acquisitionDate,
    updatedAt: deps.clock.now(),
  };

  if (fields.tissue !== undefined) {
    updated.tissue = fields.tissue;
  } else {
    delete updated.tissue;
  }
  if (fields.magnification !== undefined) {
    updated.magnification = fields.magnification;
  } else {
    delete updated.magnification;
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
