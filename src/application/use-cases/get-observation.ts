import type { Observation } from "@/domain/entities/observation";
import type { ObservationUseCaseDeps } from "./deps";

/** Fetch a single observation by id, or null when it does not exist. */
export async function getObservation(
  deps: ObservationUseCaseDeps,
  id: string,
): Promise<Observation | null> {
  return deps.repository.getById(id);
}
