import type { HistologySession } from "@/domain/entities/histology-session";
import type { HistologySessionUseCaseDeps } from "./deps";

/** Fetch a single histology session by id, or null when it does not exist. */
export async function getHistologySession(
  deps: HistologySessionUseCaseDeps,
  id: string,
): Promise<HistologySession | null> {
  return deps.repository.getById(id);
}
