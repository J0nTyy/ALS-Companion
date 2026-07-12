import { NotFoundError, StudyArchivedError } from "@/application/errors";
import type { StudyReader } from "@/application/ports/study-repository";

/**
 * Guard used before any write to a study's animal registry.
 *
 * @throws NotFoundError if the parent study does not exist (referential integrity).
 * @throws StudyArchivedError if the parent study is archived (read-only registry).
 *
 * Running this at write time closes the race where an edit form was opened while
 * the study was still active and the study is archived before the save lands.
 */
export async function assertStudyWritable(
  studies: StudyReader,
  studyId: string,
): Promise<void> {
  const study = await studies.getById(studyId);
  if (!study) {
    throw new NotFoundError("That study could not be found.");
  }
  if (study.status === "archived") {
    throw new StudyArchivedError();
  }
}
