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

/**
 * The RAW error text, for diagnostic surfaces (e.g. the AI assistant) where the
 * user needs to see the actual provider/backend message rather than a calm
 * fallback. Handles thrown strings (Tauri command rejections reject with the Rust
 * `Err` string), `Error`s, and our typed errors alike; trims and bounds the length.
 */
export function rawErrorMessage(error: unknown, fallback: string): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error);
  const trimmed = raw.trim();
  if (trimmed === "") return fallback;
  return trimmed.length > 600 ? `${trimmed.slice(0, 600)}…` : trimmed;
}

/** The offending field for typed errors that point at one, else undefined. */
export function errorField(error: unknown): string | undefined {
  if (error instanceof ValidationError || error instanceof ConflictError) {
    return error.field;
  }
  return undefined;
}
