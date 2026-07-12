import {
  ConflictError,
  DesktopRequiredError,
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";

/**
 * Turn any thrown value into a calm, jargon-free message for the researcher.
 * Only our own typed errors expose their message; anything else (e.g. a raw
 * SQLite error) falls back to a friendly, non-technical sentence.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof StudyArchivedError ||
    error instanceof DesktopRequiredError
  ) {
    return error.message;
  }
  return fallback;
}

/** The offending field for typed errors that point at one, else undefined. */
export function errorField(error: unknown): string | undefined {
  if (error instanceof ValidationError || error instanceof ConflictError) {
    return error.field;
  }
  return undefined;
}
