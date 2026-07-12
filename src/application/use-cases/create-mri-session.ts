import type {
  MRISession,
  NewMriSessionInput,
} from "@/domain/entities/mri-session";
import type { MriSessionUseCaseDeps } from "./deps";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";
import { validateMriSessionFields } from "./validate-mri-session-input";

/**
 * Create an MRI session attached to a timeline event.
 *
 * Verifies the parent timeline event exists and its study is not archived,
 * validates the fields, generates id/timestamps via injected services, persists,
 * and returns the entity. Stores metadata only — no image files.
 */
export async function createMriSession(
  deps: MriSessionUseCaseDeps,
  input: NewMriSessionInput,
): Promise<MRISession> {
  await loadWritableTimelineEvent(deps, input.timelineEventId);

  const fields = validateMriSessionFields(input);
  const now = deps.clock.now();

  const session: MRISession = {
    id: deps.ids.next(),
    timelineEventId: input.timelineEventId,
    title: fields.title,
    modality: fields.modality,
    acquisitionDate: fields.acquisitionDate,
    createdAt: now,
    updatedAt: now,
    ...(fields.anatomicalRegion !== undefined
      ? { anatomicalRegion: fields.anatomicalRegion }
      : {}),
    ...(fields.operator !== undefined ? { operator: fields.operator } : {}),
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.repository.create(session);
  return session;
}
