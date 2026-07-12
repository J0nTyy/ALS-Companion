import Database from "@tauri-apps/plugin-sql";

import { APP } from "@/shared/config/app";
import { DesktopRequiredError } from "@/application/errors";
import { isTauri } from "@/infrastructure/platform/environment";

/**
 * Lazily-opened handle to the local SQLite database.
 *
 * The connection is created on first use and reused thereafter. The schema is
 * owned by the Rust backend's migrations (see `src-tauri/src/lib.rs`); this
 * loads the same database file so those migrations are already applied.
 */
let connection: Promise<Database> | null = null;

/**
 * Open the database and explicitly enable foreign-key enforcement.
 *
 * SQLite defaults `foreign_keys` to OFF, so the `studies` → `animals` foreign key
 * would not be enforced unless we turn it on. We set the pragma and then confirm
 * it took effect, failing clearly if enforcement cannot be verified.
 */
async function openDatabase(): Promise<Database> {
  const db = await Database.load(`sqlite:${APP.databaseFile}`);
  await db.execute("PRAGMA foreign_keys = ON;");
  const rows = await db.select<Array<{ foreign_keys: number }>>(
    "PRAGMA foreign_keys;",
  );
  if (rows[0]?.foreign_keys !== 1) {
    throw new Error(
      "Could not enable foreign-key enforcement for the local database.",
    );
  }
  return db;
}

export function getDatabase(): Promise<Database> {
  if (!isTauri()) {
    // Browser preview: never touch the database. Fail clearly instead.
    return Promise.reject(new DesktopRequiredError());
  }

  if (!connection) {
    connection = openDatabase().catch((error) => {
      // Reset so a later attempt can retry a fresh connection.
      connection = null;
      throw error;
    });
  }

  return connection;
}
