import type { Study } from "@/domain/entities/study";
import { NotFoundError } from "@/application/errors";
import type { StudyUseCaseDeps } from "./deps";

/** Upper bound so a runaway draft can't bloat the row; a report summary is short prose. */
const MAX_SUMMARY_LENGTH = 8000;

/**
 * Set (or clear) a study's narrative report summary — the one field the AI
 * assistant and the Publish workspace write. It touches only `summary` (and the
 * modification time), leaving every other study field intact; a blank value clears
 * it rather than storing an empty string. Allowed regardless of status, since a
 * summary is publication metadata, not research data.
 */
export async function setStudySummary(
  deps: StudyUseCaseDeps,
  studyId: string,
  summary: string,
): Promise<Study> {
  const existing = await deps.repository.getById(studyId);
  if (!existing) {
    throw new NotFoundError("That study could not be found.");
  }

  const trimmed = summary.trim().slice(0, MAX_SUMMARY_LENGTH);
  const now = deps.clock.now();
  const updated: Study = { ...existing, updatedAt: now };
  if (trimmed.length > 0) {
    updated.summary = trimmed;
    updated.summaryUpdatedAt = now;
  } else {
    delete updated.summary;
    delete updated.summaryUpdatedAt;
  }

  await deps.repository.update(updated);
  return updated;
}
