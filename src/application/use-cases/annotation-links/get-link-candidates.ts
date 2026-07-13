import { partnersOf } from "@/domain/entities/annotation-link";
import type { AnnotatedContext } from "@/application/ports/annotation-context-reader";
import type { AnnotationLinkUseCaseDeps } from "../deps";

/**
 * The annotations a researcher can link the given one to: other annotations on the
 * same animal (across its MRI sessions), excluding the annotation itself and any it
 * is already linked to. Oldest acquisition first.
 */
export async function getLinkCandidates(
  deps: AnnotationLinkUseCaseDeps,
  annotationId: string,
): Promise<AnnotatedContext[]> {
  const [candidates, links] = await Promise.all([
    deps.context.listSiblingCandidates(annotationId),
    deps.repository.listByAnnotation(annotationId),
  ]);
  const alreadyLinked = new Set(partnersOf(links, annotationId));
  return candidates.filter((c) => !alreadyLinked.has(c.annotationId));
}
