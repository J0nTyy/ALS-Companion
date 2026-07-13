import type { Annotation } from "@/domain/entities/annotation";
import type { AnnotationUseCaseDeps } from "./deps";

/** Fetch a single annotation by id, or null when it does not exist. */
export async function getAnnotation(
  deps: AnnotationUseCaseDeps,
  id: string,
): Promise<Annotation | null> {
  return deps.repository.getById(id);
}
