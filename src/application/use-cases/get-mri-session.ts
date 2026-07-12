import type { MRISession } from "@/domain/entities/mri-session";
import type { MriSessionUseCaseDeps } from "./deps";

/** Fetch a single MRI session by id, or null when it does not exist. */
export async function getMriSession(
  deps: MriSessionUseCaseDeps,
  id: string,
): Promise<MRISession | null> {
  return deps.repository.getById(id);
}
