import type {
  NewObservationInput,
  Observation,
} from "@/domain/entities/observation";
import type { ObservationUseCaseDeps } from "./deps";
import { loadWritableAnimal } from "./load-writable-animal";
import { validateObservationFields } from "./validate-observation-input";

/**
 * Record a new observation for an animal.
 *
 * Verifies the animal exists, belongs to the given study, and that the study is
 * not archived; validates the fields (using the local calendar day for the
 * future-date rule); generates id/timestamps via injected services; persists;
 * and returns the entity. Repeated same-day measurements are kept as separate
 * records — this never merges or overwrites.
 */
export async function createObservation(
  deps: ObservationUseCaseDeps,
  input: NewObservationInput,
): Promise<Observation> {
  await loadWritableAnimal(deps, input.animalId, input.studyId);

  const fields = validateObservationFields(input, deps.calendar.today());
  const now = deps.clock.now();

  const observation: Observation = {
    id: deps.ids.next(),
    animalId: input.animalId,
    observedOn: fields.observedOn,
    kind: fields.kind,
    value: fields.value,
    createdAt: now,
    updatedAt: now,
    ...(fields.scaleName !== undefined ? { scaleName: fields.scaleName } : {}),
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.repository.create(observation);
  return observation;
}
