import type {
  HistologySession,
  NewHistologySessionInput,
} from "@/domain/entities/histology-session";
import type { HistologySessionUseCaseDeps } from "./deps";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";
import { validateHistologySessionFields } from "./validate-histology-session-input";

/**
 * Create a histology session attached to a timeline event.
 *
 * Verifies the parent timeline event exists and its study is not archived,
 * validates the fields, generates id/timestamps via injected services, persists,
 * and returns the entity. Stores metadata only — images attach via research assets.
 */
export async function createHistologySession(
  deps: HistologySessionUseCaseDeps,
  input: NewHistologySessionInput,
): Promise<HistologySession> {
  await loadWritableTimelineEvent(deps, input.timelineEventId);

  const fields = validateHistologySessionFields(input);
  const now = deps.clock.now();

  const session: HistologySession = {
    id: deps.ids.next(),
    timelineEventId: input.timelineEventId,
    stain: fields.stain,
    acquisitionDate: fields.acquisitionDate,
    createdAt: now,
    updatedAt: now,
    ...(fields.tissue !== undefined ? { tissue: fields.tissue } : {}),
    ...(fields.magnification !== undefined
      ? { magnification: fields.magnification }
      : {}),
    ...(fields.operator !== undefined ? { operator: fields.operator } : {}),
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.repository.create(session);
  return session;
}
