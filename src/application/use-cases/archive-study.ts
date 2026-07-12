import type { StudyUseCaseDeps } from "./deps";

/**
 * Archive a study. This is non-destructive: the study's status becomes
 * "archived" and its modification time is refreshed. Data is never deleted, so
 * an archived study can be reopened and restored to another status by editing.
 *
 * Per the repository contract, `archive` throws `NotFoundError` when no study
 * matches `id`, so this use case cannot report success for a missing target.
 */
export async function archiveStudy(
  deps: StudyUseCaseDeps,
  id: string,
): Promise<void> {
  await deps.repository.archive(id, deps.clock.now());
}
