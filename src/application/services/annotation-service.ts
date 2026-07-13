import type {
  Annotation,
  NewAnnotationInput,
  UpdateAnnotationInput,
} from "@/domain/entities/annotation";
import type { AnnotationUseCaseDeps } from "@/application/use-cases/deps";
import { createAnnotation } from "@/application/use-cases/create-annotation";
import { updateAnnotation } from "@/application/use-cases/update-annotation";
import { getAnnotation } from "@/application/use-cases/get-annotation";
import { listAnnotations } from "@/application/use-cases/list-annotations";
import { deleteAnnotation } from "@/application/use-cases/delete-annotation";

/**
 * Facade the presentation layer depends on for annotation operations. Hides the
 * use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL.
 *
 * Annotations are the persistent foundation of the imaging-analysis chain
 * (StoredFile → Annotation → future Measurements → future AI); this service is the
 * boundary future measurement/ROI/AI features build on.
 */
export interface AnnotationService {
  listByStoredFile(storedFileId: string): Promise<Annotation[]>;
  get(id: string): Promise<Annotation | null>;
  create(input: NewAnnotationInput): Promise<Annotation>;
  update(input: UpdateAnnotationInput): Promise<Annotation>;
  delete(id: string): Promise<void>;
}

/** Bind a dependency bundle to the annotation use cases to produce a service. */
export function createAnnotationService(
  deps: AnnotationUseCaseDeps,
): AnnotationService {
  return {
    listByStoredFile: (storedFileId) => listAnnotations(deps, storedFileId),
    get: (id) => getAnnotation(deps, id),
    create: (input) => createAnnotation(deps, input),
    update: (input) => updateAnnotation(deps, input),
    delete: (id) => deleteAnnotation(deps, id),
  };
}
