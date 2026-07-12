import type { NewStudyInput, Study } from "@/domain/entities/study";
import type { StudyUseCaseDeps } from "./deps";
import { validateStudyFields } from "./validate-study-input";

/**
 * Create a new study from researcher input.
 *
 * Validates and normalizes the fields, generates the id and timestamps via
 * injected services (never in the UI), persists the entity, and returns it.
 */
export async function createStudy(
  deps: StudyUseCaseDeps,
  input: NewStudyInput,
): Promise<Study> {
  const fields = validateStudyFields(input);
  const now = deps.clock.now();

  const study: Study = {
    id: deps.ids.next(),
    name: fields.name,
    strain: fields.strain,
    status: fields.status,
    createdAt: now,
    updatedAt: now,
    ...(fields.description !== undefined
      ? { description: fields.description }
      : {}),
  };

  await deps.repository.create(study);
  return study;
}
