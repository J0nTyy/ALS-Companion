/**
 * Application-wide constants. Keep product-facing copy and identifiers here so
 * screens stay free of magic strings and can be localized later in one place.
 */
export const APP = {
  name: "ALS Research Companion",
  shortName: "Companion",
  tagline: "A calm workspace for ALS transgenic mouse research.",
  version: "2.5.0",
  /** Local SQLite database file, resolved relative to the app data directory. */
  databaseFile: "als_research_companion.db",
  /** Highest applied SQLite migration (kept in sync with src-tauri/src/lib.rs). */
  schemaVersion: 13,
} as const;

export type AppConfig = typeof APP;

/**
 * The append-only migration history, for display in Settings → About. This mirrors
 * `src-tauri/src/lib.rs` (the source of truth); keep it in sync when adding a
 * migration. Presentation-only — the app never runs these from here.
 */
export const MIGRATIONS: ReadonlyArray<{ version: number; description: string }> = [
  { version: 1, description: "studies" },
  { version: 2, description: "animals" },
  { version: 3, description: "observations" },
  { version: 4, description: "timeline events" },
  { version: 5, description: "protocol templates + steps" },
  { version: 6, description: "MRI sessions" },
  { version: 7, description: "research assets" },
  { version: 8, description: "stored files" },
  { version: 9, description: "annotations" },
  { version: 10, description: "annotation links" },
  { version: 11, description: "histology sessions" },
  { version: 12, description: "biomarker samples" },
  { version: 13, description: "biomarker results" },
];
