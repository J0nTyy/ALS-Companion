import type {
  NewObservationInput,
  Observation,
  UpdateObservationInput,
} from "@/domain/entities/observation";
import type { ObservationUseCaseDeps } from "@/application/use-cases/deps";
import { createObservation } from "@/application/use-cases/create-observation";
import { updateObservation } from "@/application/use-cases/update-observation";
import { listObservations } from "@/application/use-cases/list-observations";
import { getObservation } from "@/application/use-cases/get-observation";

/**
 * Facade the presentation layer depends on for observation operations. Hides the
 * use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL.
 */
export interface ObservationsService {
  listByAnimal(animalId: string): Promise<Observation[]>;
  get(id: string): Promise<Observation | null>;
  create(input: NewObservationInput): Promise<Observation>;
  update(input: UpdateObservationInput): Promise<Observation>;
}

/** Bind a dependency bundle to the observation use cases to produce a service. */
export function createObservationsService(
  deps: ObservationUseCaseDeps,
): ObservationsService {
  return {
    listByAnimal: (animalId) => listObservations(deps, animalId),
    get: (id) => getObservation(deps, id),
    create: (input) => createObservation(deps, input),
    update: (input) => updateObservation(deps, input),
  };
}
