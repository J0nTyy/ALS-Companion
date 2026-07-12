import type { Study } from "@/domain/entities/study";
import type { StudyUseCaseDeps } from "./deps";

/** Fetch a single study by id, or null when it does not exist. */
export async function getStudy(
  deps: StudyUseCaseDeps,
  id: string,
): Promise<Study | null> {
  return deps.repository.getById(id);
}
