import type { Annotation } from "@/domain/entities/annotation";
import type { AnnotationUseCaseDeps } from "./deps";

/** List a stored image's annotations, oldest first (stable draw order). */
export async function listAnnotations(
  deps: AnnotationUseCaseDeps,
  storedFileId: string,
): Promise<Annotation[]> {
  return deps.repository.listByStoredFile(storedFileId);
}
