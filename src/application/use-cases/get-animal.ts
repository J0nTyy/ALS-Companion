import type { Animal } from "@/domain/entities/animal";
import type { AnimalUseCaseDeps } from "./deps";

/** Fetch a single animal by id, or null when it does not exist. */
export async function getAnimal(
  deps: AnimalUseCaseDeps,
  id: string,
): Promise<Animal | null> {
  return deps.repository.getById(id);
}
