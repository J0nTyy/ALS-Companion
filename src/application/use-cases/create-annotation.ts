import type {
  Annotation,
  NewAnnotationInput,
} from "@/domain/entities/annotation";
import type { AnnotationUseCaseDeps } from "./deps";
import { loadWritableStoredFile } from "./load-writable-stored-file";
import { validateAnnotationFields } from "./validate-annotation-input";

/**
 * Create an annotation on a stored image.
 *
 * Verifies the image exists and its study is not archived, validates the geometry
 * and metadata, generates id/timestamps via injected services, persists, and
 * returns the entity.
 */
export async function createAnnotation(
  deps: AnnotationUseCaseDeps,
  input: NewAnnotationInput,
): Promise<Annotation> {
  await loadWritableStoredFile(deps, input.storedFileId);

  const fields = validateAnnotationFields(input);
  const now = deps.clock.now();

  const annotation: Annotation = {
    id: deps.ids.next(),
    storedFileId: input.storedFileId,
    annotationType: fields.annotationType,
    geometry: fields.geometry,
    createdAt: now,
    updatedAt: now,
    ...(fields.label !== undefined ? { label: fields.label } : {}),
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.repository.create(annotation);
  return annotation;
}
