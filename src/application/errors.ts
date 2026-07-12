/**
 * Application-level error types. These are transport-agnostic: use cases throw
 * them, and the presentation layer translates them into calm, human messages.
 */

/** A user-correctable problem with the data they entered. */
export class ValidationError extends Error {
  constructor(
    message: string,
    /** The offending field, when the problem maps to a single input. */
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/** The requested entity does not exist. */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * The change would violate a uniqueness rule (e.g. a duplicate animal identifier
 * within a study). Carries the offending field so a form can highlight it.
 */
export class ConflictError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

/**
 * A desktop-only capability (the local database) was used in the browser
 * preview. Presentation catches this to show its "install the desktop app"
 * guidance instead of a technical failure.
 */
export class DesktopRequiredError extends Error {
  constructor() {
    super("Saving studies is only available in the installed desktop app.");
    this.name = "DesktopRequiredError";
  }
}

/**
 * A change to a study's animal registry was attempted while the study is
 * archived. Archived studies are read-only for animals until restored.
 */
export class StudyArchivedError extends Error {
  constructor(
    message = "Restore this study before changing its animal registry.",
  ) {
    super(message);
    this.name = "StudyArchivedError";
  }
}
