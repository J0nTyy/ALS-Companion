import type {
  MRISession,
  NewMriSessionInput,
  UpdateMriSessionInput,
} from "@/domain/entities/mri-session";
import type { MriSessionUseCaseDeps } from "@/application/use-cases/deps";
import { createMriSession } from "@/application/use-cases/create-mri-session";
import { updateMriSession } from "@/application/use-cases/update-mri-session";
import { getMriSession } from "@/application/use-cases/get-mri-session";
import { listMriSessions } from "@/application/use-cases/list-mri-sessions";

/**
 * Facade the presentation layer depends on for MRI-session operations. Hides the
 * use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL.
 */
export interface MriSessionService {
  listByTimelineEvent(timelineEventId: string): Promise<MRISession[]>;
  get(id: string): Promise<MRISession | null>;
  create(input: NewMriSessionInput): Promise<MRISession>;
  update(input: UpdateMriSessionInput): Promise<MRISession>;
}

/** Bind a dependency bundle to the MRI-session use cases to produce a service. */
export function createMriSessionService(
  deps: MriSessionUseCaseDeps,
): MriSessionService {
  return {
    listByTimelineEvent: (timelineEventId) =>
      listMriSessions(deps, timelineEventId),
    get: (id) => getMriSession(deps, id),
    create: (input) => createMriSession(deps, input),
    update: (input) => updateMriSession(deps, input),
  };
}
