import type {
  Annotation,
  UpdateAnnotationInput,
} from "@/domain/entities/annotation";
import { NotFoundError } from "@/application/errors";
import type { AnnotationUseCaseDeps } from "./deps";
import { loadWritableStoredFile } from "./load-writable-stored-file";
import { validateAnnotationFields } from "./validate-annotation-input";

/**
 * Apply researcher edits to an existing annotation (its label, notes, or shape).
 *
 * Loads the annotation (preserving its stored file and creation time), verifies
 * the image's study is still writable (exists and not archived), validates the
 * fields, refreshes the modification time, and persists. Clearing the label or
 * notes removes it.
 */
export async function updateAnnotation(
  deps: AnnotationUseCaseDeps,
  input: UpdateAnnotationInput,
): Promise<Annotation> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That annotation could not be found.");
  }

  await loadWritableStoredFile(deps, existing.storedFileId);

  const fields = validateAnnotationFields(input);

  const updated: Annotation = {
    ...existing,
    annotationType: fields.annotationType,
    geometry: fields.geometry,
    updatedAt: deps.clock.now(),
  };

  if (fields.label !== undefined) updated.label = fields.label;
  else delete updated.label;

  if (fields.notes !== undefined) updated.notes = fields.notes;
  else delete updated.notes;

  await deps.repository.update(updated);
  return updated;
}
