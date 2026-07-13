import {
  linkPartnerId,
  type AnnotationLink,
} from "@/domain/entities/annotation-link";
import type { AnnotatedContext } from "@/application/ports/annotation-context-reader";
import type { AnnotationLinkUseCaseDeps } from "../deps";

/** One entry in an annotation's linked timeline: the link, its direction, and the
 *  partner annotation's resolved context (study / animal / session / date). */
export interface LinkedAnnotationEntry {
  link: AnnotationLink;
  /** Relative to the queried annotation: it is the link's source ("outgoing") or target ("incoming"). */
  direction: "outgoing" | "incoming";
  context: AnnotatedContext;
}

/**
 * Resolve an annotation's links into a chronological timeline of the annotations it
 * connects to — each with its MRI session, date, animal, and study — ordered oldest
 * acquisition first, so progression over time reads top-to-bottom.
 */
export async function getLinkedTimeline(
  deps: AnnotationLinkUseCaseDeps,
  annotationId: string,
): Promise<LinkedAnnotationEntry[]> {
  const links = await deps.repository.listByAnnotation(annotationId);
  const entries: LinkedAnnotationEntry[] = [];
  for (const link of links) {
    const partnerId = linkPartnerId(link, annotationId);
    if (partnerId === null) continue;
    const context = await deps.context.getContext(partnerId);
    if (!context) continue; // partner or its chain is gone — skip gracefully
    entries.push({
      link,
      direction:
        link.sourceAnnotationId === annotationId ? "outgoing" : "incoming",
      context,
    });
  }
  entries.sort(
    (a, b) =>
      a.context.acquisitionDate.localeCompare(b.context.acquisitionDate) ||
      a.link.createdAt.localeCompare(b.link.createdAt),
  );
  return entries;
}
