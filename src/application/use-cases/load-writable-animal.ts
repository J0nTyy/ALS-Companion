import type { Animal } from "@/domain/entities/animal";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import { NotFoundError } from "@/application/errors";
import { assertStudyWritable } from "./assert-study-writable";

/**
 * Load an animal and confirm it can be written to (used before recording or
 * editing observations).
 *
 * @throws NotFoundError if the animal is missing, or (when `expectedStudyId` is
 *   given) if it does not belong to that study.
 * @throws StudyArchivedError if the animal's study is archived.
 *
 * Running this at write time also closes the race where the form was opened while
 * the study was active and it is archived before the save lands.
 */
export async function loadWritableAnimal(
  deps: { animals: AnimalReader; studies: StudyReader },
  animalId: string,
  expectedStudyId?: string,
): Promise<Animal> {
  const animal = await deps.animals.getById(animalId);
  if (!animal) {
    throw new NotFoundError("That animal could not be found.");
  }
  if (expectedStudyId !== undefined && animal.studyId !== expectedStudyId) {
    throw new NotFoundError("That animal is not part of this study.");
  }
  await assertStudyWritable(deps.studies, animal.studyId);
  return animal;
}
