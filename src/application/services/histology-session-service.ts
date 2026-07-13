import type {
  HistologySession,
  NewHistologySessionInput,
  UpdateHistologySessionInput,
} from "@/domain/entities/histology-session";
import type { HistologySessionUseCaseDeps } from "@/application/use-cases/deps";
import { createHistologySession } from "@/application/use-cases/create-histology-session";
import { updateHistologySession } from "@/application/use-cases/update-histology-session";
import { getHistologySession } from "@/application/use-cases/get-histology-session";
import { listHistologySessions } from "@/application/use-cases/list-histology-sessions";

/**
 * Facade the presentation layer depends on for histology-session operations. Hides
 * the use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL. Deleting a session goes through the
 * DeletionService (so its research assets and files cascade), mirroring MRI.
 */
export interface HistologySessionService {
  listByTimelineEvent(timelineEventId: string): Promise<HistologySession[]>;
  get(id: string): Promise<HistologySession | null>;
  create(input: NewHistologySessionInput): Promise<HistologySession>;
  update(input: UpdateHistologySessionInput): Promise<HistologySession>;
}

/** Bind a dependency bundle to the histology-session use cases to produce a service. */
export function createHistologySessionService(
  deps: HistologySessionUseCaseDeps,
): HistologySessionService {
  return {
    listByTimelineEvent: (timelineEventId) =>
      listHistologySessions(deps, timelineEventId),
    get: (id) => getHistologySession(deps, id),
    create: (input) => createHistologySession(deps, input),
    update: (input) => updateHistologySession(deps, input),
  };
}
