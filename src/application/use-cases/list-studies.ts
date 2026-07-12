import type { Study } from "@/domain/entities/study";
import type { StudyListOptions } from "@/application/ports/study-repository";
import type { StudyUseCaseDeps } from "./deps";

/** List studies, newest-updated first. Excludes archived unless requested. */
export async function listStudies(
  deps: StudyUseCaseDeps,
  options?: StudyListOptions,
): Promise<Study[]> {
  return deps.repository.list(options);
}
