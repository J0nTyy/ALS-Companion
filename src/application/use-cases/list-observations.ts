import type { Observation } from "@/domain/entities/observation";
import type { ObservationUseCaseDeps } from "./deps";

/** List an animal's observations, most recent first (by observed date). */
export async function listObservations(
  deps: ObservationUseCaseDeps,
  animalId: string,
): Promise<Observation[]> {
  return deps.repository.listByAnimal(animalId);
}
