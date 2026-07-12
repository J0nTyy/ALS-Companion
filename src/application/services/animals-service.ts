import type {
  Animal,
  NewAnimalInput,
  UpdateAnimalInput,
} from "@/domain/entities/animal";
import type { AnimalCreationDeps } from "@/application/use-cases/deps";
import { createAnimal } from "@/application/use-cases/create-animal";
import { applyProtocolToAnimal } from "@/application/use-cases/apply-protocol-to-animal";
import { updateAnimal } from "@/application/use-cases/update-animal";
import { listAnimals } from "@/application/use-cases/list-animals";
import { getAnimal } from "@/application/use-cases/get-animal";

/**
 * Facade the presentation layer depends on for animal operations. Hides the
 * use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL.
 */
export interface AnimalsService {
  listByStudy(studyId: string): Promise<Animal[]>;
  get(id: string): Promise<Animal | null>;
  create(input: NewAnimalInput): Promise<Animal>;
  update(input: UpdateAnimalInput): Promise<Animal>;
}

/** Bind a dependency bundle to the animal use cases to produce a service. */
export function createAnimalsService(
  deps: AnimalCreationDeps,
): AnimalsService {
  return {
    listByStudy: (studyId) => listAnimals(deps, studyId),
    get: (id) => getAnimal(deps, id),
    create: async (input) => {
      // Creating an animal also seeds its experiment timeline from the study's
      // protocol (if any). The animal is created first; then planned events are
      // generated from each protocol step.
      const animal = await createAnimal(deps, input);
      await applyProtocolToAnimal(deps, animal);
      return animal;
    },
    update: (input) => updateAnimal(deps, input),
  };
}
