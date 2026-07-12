import type { Study, UpdateStudyInput } from "@/domain/entities/study";
import { NotFoundError } from "@/application/errors";
import type { StudyUseCaseDeps } from "./deps";
import { validateStudyFields } from "./validate-study-input";

/**
 * Apply researcher edits to an existing study.
 *
 * Loads the current study (so its creation time is preserved), validates the
 * incoming fields, refreshes the modification time, and persists. Clearing the
 * description removes it rather than storing an empty string.
 */
export async function updateStudy(
  deps: StudyUseCaseDeps,
  input: UpdateStudyInput,
): Promise<Study> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That study could not be found.");
  }

  const fields = validateStudyFields(input);

  const updated: Study = {
    ...existing,
    name: fields.name,
    strain: fields.strain,
    status: fields.status,
    updatedAt: deps.clock.now(),
  };

  if (fields.description !== undefined) {
    updated.description = fields.description;
  } else {
    delete updated.description;
  }

  await deps.repository.update(updated);
  return updated;
}
