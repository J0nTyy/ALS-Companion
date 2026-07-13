import { NotFoundError, StudyArchivedError } from "@/application/errors";
import type { AnnotationLinkUseCaseDeps } from "../deps";

/**
 * Remove a longitudinal link. Refuses if the source annotation's study is archived
 * (archived studies stay read-only); a link whose source annotation no longer
 * resolves is still removable (it's an orphan).
 */
export async function deleteAnnotationLink(
  deps: AnnotationLinkUseCaseDeps,
  id: string,
): Promise<void> {
  const link = await deps.repository.getById(id);
  if (!link) {
    throw new NotFoundError("That link could not be found.");
  }
  const source = await deps.context.getContext(link.sourceAnnotationId);
  if (source && source.studyStatus === "archived") {
    throw new StudyArchivedError(
      "Restore this study before changing its annotation links.",
    );
  }
  await deps.repository.delete(id);
}
