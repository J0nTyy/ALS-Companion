import type { AnnotationType } from "@/domain/entities/annotation";
import type { StudyStatus } from "@/domain/entities/study";

/**
 * The longitudinal context of one annotation — where it sits in the research tree
 * (which study / animal / MRI session / date). Assembled by a read-only SQL join
 * over annotations → stored_files → research_assets → mri_sessions →
 * timeline_events → animals → studies. No new table.
 */
export interface AnnotatedContext {
  annotationId: string;
  label: string | null;
  annotationType: AnnotationType;
  storedFileId: string;
  studyId: string;
  studyName: string;
  studyStatus: StudyStatus;
  animalId: string;
  animalIdentifier: string;
  timelineEventId: string;
  mriSessionId: string;
  mriSessionTitle: string;
  /** MRI acquisition date (YYYY-MM-DD) — used to order a linked timeline. */
  acquisitionDate: string;
}

/**
 * Port: read-only resolution of an annotation's context and its longitudinal
 * "sibling" candidates (other annotations on the same animal, across sessions).
 * Used by the annotation-link use cases to display and validate links.
 */
export interface AnnotationContextReader {
  /** Full context for one annotation, or null if it (or its chain) is missing. */
  getContext(annotationId: string): Promise<AnnotatedContext | null>;

  /**
   * Other annotations belonging to the same animal as `annotationId` (across all of
   * that animal's MRI sessions), excluding the annotation itself — the candidates a
   * researcher can link it to. Oldest acquisition first.
   */
  listSiblingCandidates(annotationId: string): Promise<AnnotatedContext[]>;
}
