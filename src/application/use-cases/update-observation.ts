import type {
  Observation,
  UpdateObservationInput,
} from "@/domain/entities/observation";
import { NotFoundError } from "@/application/errors";
import type { ObservationUseCaseDeps } from "./deps";
import { loadWritableAnimal } from "./load-writable-animal";
import { validateObservationFields } from "./validate-observation-input";

/**
 * Apply researcher edits to an existing observation.
 *
 * Loads the observation (preserving its animal and creation time), verifies the
 * parent animal's study is still writable (exists and not archived — closing the
 * archive-while-editing race), validates the fields, refreshes the modification
 * time, and persists. Clearing an optional field removes it.
 */
export async function updateObservation(
  deps: ObservationUseCaseDeps,
  input: UpdateObservationInput,
): Promise<Observation> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That observation could not be found.");
  }

  await loadWritableAnimal(deps, existing.animalId);

  const fields = validateObservationFields(input, deps.calendar.today());

  const updated: Observation = {
    ...existing,
    observedOn: fields.observedOn,
    kind: fields.kind,
    value: fields.value,
    updatedAt: deps.clock.now(),
  };

  if (fields.scaleName !== undefined) {
    updated.scaleName = fields.scaleName;
  } else {
    delete updated.scaleName;
  }
  if (fields.notes !== undefined) {
    updated.notes = fields.notes;
  } else {
    delete updated.notes;
  }

  await deps.repository.update(updated);
  return updated;
}
