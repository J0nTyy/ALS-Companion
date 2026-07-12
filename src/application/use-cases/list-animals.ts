import type { Animal } from "@/domain/entities/animal";
import type { AnimalUseCaseDeps } from "./deps";

/** List the animals in a study, newest-updated first. */
export async function listAnimals(
  deps: AnimalUseCaseDeps,
  studyId: string,
): Promise<Animal[]> {
  return deps.repository.listByStudy(studyId);
}
