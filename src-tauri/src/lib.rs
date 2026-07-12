use tauri_plugin_sql::{Migration, MigrationKind};

/// SQLite database URL, resolved by the SQL plugin relative to the app's data
/// directory. Keeping the schema here — versioned via migrations — means the
/// database evolves safely as the product grows.
const DB_URL: &str = "sqlite:als_research_companion.db";

/// Ordered, append-only list of schema migrations. Never edit a shipped
/// migration; add a new one with the next version number instead.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_studies_table",
            sql: "CREATE TABLE IF NOT EXISTS studies (
                id          TEXT PRIMARY KEY NOT NULL,
                name        TEXT NOT NULL,
                description TEXT,
                strain      TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'planning',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_animals_table",
            sql: "CREATE TABLE IF NOT EXISTS animals (
                id                TEXT PRIMARY KEY NOT NULL,
                study_id          TEXT NOT NULL,
                animal_identifier TEXT NOT NULL,
                sex               TEXT NOT NULL DEFAULT 'unknown',
                date_of_birth     TEXT,
                mutation          TEXT,
                treatment_group   TEXT,
                created_at        TEXT NOT NULL,
                updated_at        TEXT NOT NULL,
                FOREIGN KEY (study_id) REFERENCES studies (id)
            );
            CREATE INDEX IF NOT EXISTS idx_animals_study_id
                ON animals (study_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_animals_study_identifier
                ON animals (study_id, animal_identifier);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_observations_table",
            sql: "CREATE TABLE IF NOT EXISTS observations (
                id          TEXT PRIMARY KEY NOT NULL,
                animal_id   TEXT NOT NULL,
                observed_on TEXT NOT NULL,
                kind        TEXT NOT NULL,
                value       REAL NOT NULL,
                scale_name  TEXT,
                notes       TEXT,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                FOREIGN KEY (animal_id) REFERENCES animals (id)
            );
            CREATE INDEX IF NOT EXISTS idx_observations_animal_date
                ON observations (animal_id, observed_on DESC);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_timeline_events_table",
            sql: "CREATE TABLE IF NOT EXISTS timeline_events (
                id             TEXT PRIMARY KEY NOT NULL,
                animal_id      TEXT NOT NULL,
                title          TEXT NOT NULL,
                category       TEXT NOT NULL,
                status         TEXT NOT NULL DEFAULT 'planned',
                planned_date   TEXT,
                completed_date TEXT,
                notes          TEXT,
                created_at     TEXT NOT NULL,
                updated_at     TEXT NOT NULL,
                FOREIGN KEY (animal_id) REFERENCES animals (id)
            );
            CREATE INDEX IF NOT EXISTS idx_timeline_events_animal_id
                ON timeline_events (animal_id);
            CREATE INDEX IF NOT EXISTS idx_timeline_events_planned_date
                ON timeline_events (planned_date);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_protocol_tables",
            sql: "CREATE TABLE IF NOT EXISTS protocol_templates (
                id         TEXT PRIMARY KEY NOT NULL,
                study_id   TEXT NOT NULL,
                name       TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (study_id) REFERENCES studies (id)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_templates_study
                ON protocol_templates (study_id);
            CREATE TABLE IF NOT EXISTS protocol_steps (
                id                   TEXT PRIMARY KEY NOT NULL,
                protocol_template_id TEXT NOT NULL,
                title                TEXT NOT NULL,
                category             TEXT NOT NULL,
                offset_days          INTEGER NOT NULL DEFAULT 0,
                notes                TEXT,
                display_order        INTEGER NOT NULL DEFAULT 0,
                created_at           TEXT NOT NULL,
                updated_at           TEXT NOT NULL,
                FOREIGN KEY (protocol_template_id) REFERENCES protocol_templates (id)
            );
            CREATE INDEX IF NOT EXISTS idx_protocol_steps_template
                ON protocol_steps (protocol_template_id);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_mri_sessions_table",
            sql: "CREATE TABLE IF NOT EXISTS mri_sessions (
                id                TEXT PRIMARY KEY NOT NULL,
                timeline_event_id TEXT NOT NULL,
                title             TEXT NOT NULL,
                modality          TEXT NOT NULL DEFAULT 'mri',
                anatomical_region TEXT,
                acquisition_date  TEXT NOT NULL,
                operator          TEXT,
                notes             TEXT,
                created_at        TEXT NOT NULL,
                updated_at        TEXT NOT NULL,
                FOREIGN KEY (timeline_event_id) REFERENCES timeline_events (id)
            );
            CREATE INDEX IF NOT EXISTS idx_mri_sessions_timeline_event
                ON mri_sessions (timeline_event_id);
            CREATE INDEX IF NOT EXISTS idx_mri_sessions_acquisition_date
                ON mri_sessions (acquisition_date);",
            kind: MigrationKind::Up,
        },
        // A research_asset is metadata describing a scientific file (MRI image,
        // histology/microscopy image, PDF, spreadsheet, document, video, ...).
        // It stores METADATA ONLY — deliberately no file path, blob, or binary
        // column. Actual file storage/viewing is gated behind the CSP security
        // milestone and lands later. The owner is polymorphic (owner_type,
        // owner_id) so there is intentionally no foreign key; owner existence is
        // enforced in the application layer.
        Migration {
            version: 7,
            description: "create_research_assets_table",
            sql: "CREATE TABLE IF NOT EXISTS research_assets (
                id          TEXT PRIMARY KEY NOT NULL,
                owner_type  TEXT NOT NULL,
                owner_id    TEXT NOT NULL,
                asset_type  TEXT NOT NULL,
                title       TEXT NOT NULL,
                description TEXT,
                status      TEXT NOT NULL DEFAULT 'planned',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_research_assets_owner
                ON research_assets (owner_type, owner_id);
            CREATE INDEX IF NOT EXISTS idx_research_assets_created_at
                ON research_assets (created_at DESC);",
            kind: MigrationKind::Up,
        },
        // A stored_file links a research_asset (real FK — research_assets has a
        // primary key) to an actual file kept in the app's managed data directory.
        // Only a RELATIVE PATH is stored — never the image bytes (SQLite holds no
        // blobs). storage_type keeps the mechanism abstract so a future backend can
        // be added without a schema change; checksum is an optional placeholder for
        // future integrity checks.
        Migration {
            version: 8,
            description: "create_stored_files_table",
            sql: "CREATE TABLE IF NOT EXISTS stored_files (
                id                TEXT PRIMARY KEY NOT NULL,
                research_asset_id TEXT NOT NULL,
                storage_type      TEXT NOT NULL DEFAULT 'local_managed',
                relative_path     TEXT NOT NULL,
                original_name     TEXT NOT NULL,
                mime_type         TEXT NOT NULL,
                checksum          TEXT,
                created_at        TEXT NOT NULL,
                FOREIGN KEY (research_asset_id) REFERENCES research_assets (id)
            );
            CREATE INDEX IF NOT EXISTS idx_stored_files_asset
                ON stored_files (research_asset_id, created_at DESC);",
            kind: MigrationKind::Up,
        },
    ]
}

/// Copy a user-picked image into the app's managed data directory.
///
/// This is the ONLY filesystem-write capability exposed to the webview, and it is
/// deliberately narrow: the frontend supplies the source path (a file the user
/// explicitly chose via the OS dialog) and a caller-controlled RELATIVE path; the
/// destination is always resolved under `app_local_data_dir`, so the webview can
/// never write outside the app's own storage. `relative_path` is rejected if it is
/// absolute or contains a `..` component (path-traversal guard).
#[tauri::command]
fn attach_image_file(
    app: tauri::AppHandle,
    source_path: String,
    relative_path: String,
) -> Result<(), String> {
    use std::path::{Component, Path};
    use tauri::Manager;

    let rel = Path::new(&relative_path);
    if rel.is_absolute()
        || rel
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::RootDir | Component::Prefix(_)))
    {
        return Err("Invalid storage path.".into());
    }

    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Could not resolve the app data directory: {e}"))?;
    let dest = base.join(rel);

    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Could not prepare the storage folder: {e}"))?;
    }
    std::fs::copy(&source_path, &dest)
        .map_err(|e| format!("Could not save the image: {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![attach_image_file])
        .run(tauri::generate_context!())
        .expect("error while running the ALS Research Companion application");
}
