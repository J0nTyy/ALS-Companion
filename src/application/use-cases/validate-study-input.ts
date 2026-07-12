import { isStudyStatus, type StudyStatus } from "@/domain/entities/study";
import { ValidationError } from "@/application/errors";

/** Raw, possibly-untrimmed fields coming from a form. */
export interface StudyFieldsInput {
  name?: string;
  strain?: string;
  status?: string;
  description?: string;
}

/** Clean, validated fields ready to build a {@link Study}. */
export interface ValidatedStudyFields {
  name: string;
  strain: string;
  status: StudyStatus;
  /** Omitted entirely when the researcher left it blank. */
  description?: string;
}

/**
 * Validate and normalize the fields a researcher entered for a study.
 *
 * - `name` and `strain` are trimmed and must be non-empty.
 * - `status` defaults to "planning" and must be a known {@link StudyStatus}.
 * - `description` is trimmed; a blank value is dropped rather than stored as "".
 *
 * Throws {@link ValidationError} (with the offending field) on the first problem.
 */
export function validateStudyFields(
  input: StudyFieldsInput,
): ValidatedStudyFields {
  const name = (input.name ?? "").trim();
  if (name.length === 0) {
    throw new ValidationError("Please enter a study name.", "name");
  }

  const strain = (input.strain ?? "").trim();
  if (strain.length === 0) {
    throw new ValidationError("Please enter a strain or line.", "strain");
  }

  const status = input.status ?? "planning";
  if (!isStudyStatus(status)) {
    throw new ValidationError("Please choose a valid status.", "status");
  }

  const description = (input.description ?? "").trim();

  return {
    name,
    strain,
    status,
    ...(description.length > 0 ? { description } : {}),
  };
}
