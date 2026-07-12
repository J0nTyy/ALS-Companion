import type { Animal, NewAnimalInput } from "@/domain/entities/animal";
import { ConflictError } from "@/application/errors";
import type { AnimalUseCaseDeps } from "./deps";
import { assertStudyWritable } from "./assert-study-writable";
import { validateAnimalFields } from "./validate-animal-input";

const DUPLICATE_MESSAGE =
  "An animal with this ID already exists in this study.";

/**
 * Add a new animal to a study.
 *
 * Verifies the parent study exists and is not archived, validates and normalizes
 * the fields (using the local calendar day for the future-date rule), rejects a
 * duplicate identifier within the study, generates the id and timestamps via
 * injected services, persists, and returns the entity. (The database also
 * enforces uniqueness and the foreign key as safety nets.)
 */
export async function createAnimal(
  deps: AnimalUseCaseDeps,
  input: NewAnimalInput,
): Promise<Animal> {
  await assertStudyWritable(deps.studies, input.studyId);

  const today = deps.calendar.today();
  const fields = validateAnimalFields(input, today);

  const clash = await deps.repository.findByIdentifier(
    input.studyId,
    fields.animalIdentifier,
  );
  if (clash) {
    throw new ConflictError(DUPLICATE_MESSAGE, "animalIdentifier");
  }

  const now = deps.clock.now();
  const animal: Animal = {
    id: deps.ids.next(),
    studyId: input.studyId,
    animalIdentifier: fields.animalIdentifier,
    sex: fields.sex,
    createdAt: now,
    updatedAt: now,
    ...(fields.dateOfBirth !== undefined
      ? { dateOfBirth: fields.dateOfBirth }
      : {}),
    ...(fields.mutation !== undefined ? { mutation: fields.mutation } : {}),
    ...(fields.treatmentGroup !== undefined
      ? { treatmentGroup: fields.treatmentGroup }
      : {}),
  };

  await deps.repository.create(animal);
  return animal;
}
