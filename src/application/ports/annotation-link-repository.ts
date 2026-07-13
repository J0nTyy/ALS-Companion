import type { AnnotationLink } from "@/domain/entities/annotation-link";

/**
 * Port: persistence for {@link AnnotationLink} rows (researcher-created
 * longitudinal relationships between annotations). CRUD only — links are never
 * inferred. A concrete SQLite adapter lives in `infrastructure`.
 */
export interface AnnotationLinkRepository {
  /** Links where the annotation is the source OR the target. */
  listByAnnotation(annotationId: string): Promise<AnnotationLink[]>;

  /** Links touching any of the given annotation ids (used by MRI comparison). */
  listForAnnotations(
    annotationIds: readonly string[],
  ): Promise<AnnotationLink[]>;

  /** An existing link between the two annotations in EITHER direction, or null. */
  findBetween(
    annotationIdA: string,
    annotationIdB: string,
  ): Promise<AnnotationLink | null>;

  getById(id: string): Promise<AnnotationLink | null>;

  create(link: AnnotationLink): Promise<void>;

  /** Delete one link by id. Idempotent. */
  delete(id: string): Promise<void>;

  /**
   * Delete every link that references an annotation (as source or target).
   * Called before an annotation itself is deleted (links FK-reference it).
   */
  deleteForAnnotation(annotationId: string): Promise<void>;
}
