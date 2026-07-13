import type { AnnotationLink } from "@/domain/entities/annotation-link";
import type { AnnotationLinkUseCaseDeps } from "../deps";

/** All links touching an annotation (either direction), unresolved. */
export async function listAnnotationLinks(
  deps: AnnotationLinkUseCaseDeps,
  annotationId: string,
): Promise<AnnotationLink[]> {
  return deps.repository.listByAnnotation(annotationId);
}
