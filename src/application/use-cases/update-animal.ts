import type { Animal, UpdateAnimalInput } from "@/domain/entities/animal";
import { ConflictError, NotFoundError } from "@/application/errors";
import type { AnimalUseCaseDeps } from "./deps";
import { assertStudyWritable } from "./assert-study-writable";
import { validateAnimalFields } from "./validate-animal-input";

const DUPLICATE_MESSAGE =
  "An animal with this ID already exists in this study.";

/**
 * Apply researcher edits to an existing animal.
 *
 * Loads the current animal (preserving its study and creation time), verifies
 * the parent study still exists and is not archived (closing the race where the
 * study is archived while the edit form is open), validates the incoming fields
 * (using the local calendar day), rejects a duplicate identifier within the same
 * study (other than this animal), refreshes the modification time, and persists.
 * Clearing an optional field removes it rather than storing an empty string.
 */
export async function updateAnimal(
  deps: AnimalUseCaseDeps,
  input: UpdateAnimalInput,
): Promise<Animal> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That animal could not be found.");
  }

  await assertStudyWritable(deps.studies, existing.studyId);

  const today = deps.calendar.today();
  const fields = validateAnimalFields(input, today);

  const clash = await deps.repository.findByIdentifier(
    existing.studyId,
    fields.animalIdentifier,
  );
  if (clash && clash.id !== existing.id) {
    throw new ConflictError(DUPLICATE_MESSAGE, "animalIdentifier");
  }

  const updated: Animal = {
    ...existing,
    animalIdentifier: fields.animalIdentifier,
    sex: fields.sex,
    updatedAt: deps.clock.now(),
  };

  if (fields.dateOfBirth !== undefined) {
    updated.dateOfBirth = fields.dateOfBirth;
  } else {
    delete updated.dateOfBirth;
  }
  if (fields.mutation !== undefined) {
    updated.mutation = fields.mutation;
  } else {
    delete updated.mutation;
  }
  if (fields.treatmentGroup !== undefined) {
    updated.treatmentGroup = fields.treatmentGroup;
  } else {
    delete updated.treatmentGroup;
  }

  await deps.repository.update(updated);
  return updated;
}
