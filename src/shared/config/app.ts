/**
 * Application-wide constants. Keep product-facing copy and identifiers here so
 * screens stay free of magic strings and can be localized later in one place.
 */
export const APP = {
  name: "ALS Research Companion",
  shortName: "Companion",
  tagline: "A calm workspace for ALS transgenic mouse research.",
  version: "0.1.0",
  /** Local SQLite database file, resolved relative to the app data directory. */
  databaseFile: "als_research_companion.db",
} as const;

export type AppConfig = typeof APP;
