/**
 * Ports for ambient system services. Injecting these (rather than calling
 * `Date` / `crypto` directly inside use cases) keeps the business logic pure and
 * deterministically testable.
 */

/** Supplies the current time as an ISO-8601 string. */
export interface Clock {
  now(): string;
}

/** Supplies stable unique identifiers. */
export interface IdGenerator {
  next(): string;
}
