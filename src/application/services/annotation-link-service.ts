import type {
  AnnotationLink,
  NewAnnotationLinkInput,
} from "@/domain/entities/annotation-link";
import type { AnnotatedContext } from "@/application/ports/annotation-context-reader";
import type { AnnotationLinkUseCaseDeps } from "@/application/use-cases/deps";
import { createAnnotationLink } from "@/application/use-cases/annotation-links/create-annotation-link";
import { deleteAnnotationLink } from "@/application/use-cases/annotation-links/delete-annotation-link";
import { listAnnotationLinks } from "@/application/use-cases/annotation-links/list-annotation-links";
import {
  getLinkedTimeline,
  type LinkedAnnotationEntry,
} from "@/application/use-cases/annotation-links/get-linked-timeline";
import { getLinkCandidates } from "@/application/use-cases/annotation-links/get-link-candidates";

export type { LinkedAnnotationEntry } from "@/application/use-cases/annotation-links/get-linked-timeline";

/**
 * Facade the presentation layer depends on for longitudinal annotation links.
 * Hides the use-case functions + repositories; presentation talks to this
 * interface only. Links are researcher-created — nothing here infers correspondence.
 */
export interface AnnotationLinkService {
  create(input: NewAnnotationLinkInput): Promise<AnnotationLink>;
  delete(id: string): Promise<void>;
  listLinks(annotationId: string): Promise<AnnotationLink[]>;
  /** Linked annotations resolved to their context, ordered oldest-first. */
  getLinkedTimeline(annotationId: string): Promise<LinkedAnnotationEntry[]>;
  /** Candidate annotations to link to (same animal, other sessions; not already linked). */
  getLinkCandidates(annotationId: string): Promise<AnnotatedContext[]>;
  /** Links touching any of the given annotations (used by MRI comparison). */
  listLinksForAnnotations(
    annotationIds: readonly string[],
  ): Promise<AnnotationLink[]>;
}

export function createAnnotationLinkService(
  deps: AnnotationLinkUseCaseDeps,
): AnnotationLinkService {
  return {
    create: (input) => createAnnotationLink(deps, input),
    delete: (id) => deleteAnnotationLink(deps, id),
    listLinks: (annotationId) => listAnnotationLinks(deps, annotationId),
    getLinkedTimeline: (annotationId) => getLinkedTimeline(deps, annotationId),
    getLinkCandidates: (annotationId) => getLinkCandidates(deps, annotationId),
    listLinksForAnnotations: (annotationIds) =>
      deps.repository.listForAnnotations(annotationIds),
  };
}
