import { NotFoundError } from "@/application/errors";
import type { AnnotationUseCaseDeps } from "./deps";
import { loadWritableStoredFile } from "./load-writable-stored-file";

/**
 * Delete a single annotation (the researcher-initiated "Delete annotation" action
 * inside the viewer). Verifies the annotation exists and its image's study is not
 * archived (archived studies stay read-only), then removes it.
 *
 * This is distinct from the v1.4 cascading delete of a whole study/asset/image —
 * that path (DeletionService) removes annotations as part of tearing down their
 * parent and is not gated on archive status.
 */
export async function deleteAnnotation(
  deps: AnnotationUseCaseDeps,
  id: string,
): Promise<void> {
  const existing = await deps.repository.getById(id);
  if (!existing) {
    throw new NotFoundError("That annotation could not be found.");
  }
  await loadWritableStoredFile(deps, existing.storedFileId);
  // Remove its longitudinal links first — they FK-reference this annotation.
  await deps.annotationLinks.deleteForAnnotation(id);
  await deps.repository.delete(id);
}
