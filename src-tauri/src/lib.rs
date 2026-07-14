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
        // An annotation is a researcher-drawn mark on a stored image (a real FK —
        // stored_files has a primary key). It is the persistent foundation of the
        // imaging-analysis chain: StoredFile → Annotation → (future) Measurements
        // → (future) AI. `geometry` is stored as an OPAQUE, EXTENSIBLE serialized
        // string (JSON of normalized [0,1] coordinates) rather than fixed
        // coordinate columns, so new annotation shapes (polygon, freehand, ROI, …)
        // and future measurement layers need no schema redesign. label and notes
        // are optional.
        Migration {
            version: 9,
            description: "create_annotations_table",
            sql: "CREATE TABLE IF NOT EXISTS annotations (
                id              TEXT PRIMARY KEY NOT NULL,
                stored_file_id  TEXT NOT NULL,
                annotation_type TEXT NOT NULL,
                label           TEXT,
                geometry        TEXT NOT NULL,
                notes           TEXT,
                created_at      TEXT NOT NULL,
                updated_at      TEXT NOT NULL,
                FOREIGN KEY (stored_file_id) REFERENCES stored_files (id)
            );
            CREATE INDEX IF NOT EXISTS idx_annotations_stored_file
                ON annotations (stored_file_id, created_at);",
            kind: MigrationKind::Up,
        },
        // A researcher-created, DIRECTIONAL relationship between two annotations
        // (both real FKs → annotations) that represent the same structure across
        // different MRI sessions — the basis for longitudinal progression study.
        // These are human-entered knowledge: there is no automatic matching or AI.
        // Future progression/growth/statistics/AI modules consume these links
        // rather than inferring correspondence.
        Migration {
            version: 10,
            description: "create_annotation_links_table",
            sql: "CREATE TABLE IF NOT EXISTS annotation_links (
                id                   TEXT PRIMARY KEY NOT NULL,
                source_annotation_id TEXT NOT NULL,
                target_annotation_id TEXT NOT NULL,
                relationship_type    TEXT NOT NULL,
                notes                TEXT,
                created_at           TEXT NOT NULL,
                FOREIGN KEY (source_annotation_id) REFERENCES annotations (id),
                FOREIGN KEY (target_annotation_id) REFERENCES annotations (id)
            );
            CREATE INDEX IF NOT EXISTS idx_annotation_links_source
                ON annotation_links (source_annotation_id);
            CREATE INDEX IF NOT EXISTS idx_annotation_links_target
                ON annotation_links (target_annotation_id);",
            kind: MigrationKind::Up,
        },
        // A histology_session is the histology counterpart of an mri_session: an
        // imaging session hanging off a timeline event (typically a "histopathology"
        // event). It stores METADATA ONLY — the actual images attach through the
        // shared research_assets → stored_files abstraction, exactly like MRI, so no
        // image/blob column here. `stain` is an extensible vocabulary enforced in the
        // domain (H&E, Nissl, Luxol Fast Blue, GFAP, Iba1, Other, …); tissue,
        // magnification, operator, and notes are optional free text.
        Migration {
            version: 11,
            description: "create_histology_sessions_table",
            sql: "CREATE TABLE IF NOT EXISTS histology_sessions (
                id                TEXT PRIMARY KEY NOT NULL,
                timeline_event_id TEXT NOT NULL,
                stain             TEXT NOT NULL DEFAULT 'he',
                tissue            TEXT,
                magnification     TEXT,
                acquisition_date  TEXT NOT NULL,
                operator          TEXT,
                notes             TEXT,
                created_at        TEXT NOT NULL,
                updated_at        TEXT NOT NULL,
                FOREIGN KEY (timeline_event_id) REFERENCES timeline_events (id)
            );
            CREATE INDEX IF NOT EXISTS idx_histology_sessions_timeline_event
                ON histology_sessions (timeline_event_id);
            CREATE INDEX IF NOT EXISTS idx_histology_sessions_acquisition_date
                ON histology_sessions (acquisition_date);",
            kind: MigrationKind::Up,
        },
        // A biomarker_sample is a biological sample collected for molecular /
        // biochemical analysis, hanging off a timeline event (typically a
        // "biochemical_analysis" event). It is the laboratory-evidence PARENT of one
        // or more biomarker_results. Metadata only; sample_type is an extensible
        // vocabulary enforced in the domain (Blood, CSF, Spinal Cord, Brain Tissue,
        // Muscle, Other); operator and notes are optional.
        Migration {
            version: 12,
            description: "create_biomarker_samples_table",
            sql: "CREATE TABLE IF NOT EXISTS biomarker_samples (
                id                TEXT PRIMARY KEY NOT NULL,
                timeline_event_id TEXT NOT NULL,
                sample_type       TEXT NOT NULL DEFAULT 'blood',
                collection_date   TEXT NOT NULL,
                operator          TEXT,
                notes             TEXT,
                created_at        TEXT NOT NULL,
                updated_at        TEXT NOT NULL,
                FOREIGN KEY (timeline_event_id) REFERENCES timeline_events (id)
            );
            CREATE INDEX IF NOT EXISTS idx_biomarker_samples_timeline_event
                ON biomarker_samples (timeline_event_id);
            CREATE INDEX IF NOT EXISTS idx_biomarker_samples_collection_date
                ON biomarker_samples (collection_date);",
            kind: MigrationKind::Up,
        },
        // A biomarker_result is one laboratory value reported for a biomarker_sample
        // (real FK — biomarker_samples has a primary key). biomarker_name is FREE
        // TEXT so the schema supports unlimited biomarkers; `value` is stored
        // verbatim as text (never normalized) so qualitative readouts are preserved.
        // Results carry only a creation timestamp (no updated_at) — they are point-
        // in-time evidence. unit, method, and notes are optional.
        Migration {
            version: 13,
            description: "create_biomarker_results_table",
            sql: "CREATE TABLE IF NOT EXISTS biomarker_results (
                id                 TEXT PRIMARY KEY NOT NULL,
                biomarker_sample_id TEXT NOT NULL,
                biomarker_name     TEXT NOT NULL,
                value              TEXT NOT NULL,
                unit               TEXT,
                method             TEXT,
                notes              TEXT,
                created_at         TEXT NOT NULL,
                FOREIGN KEY (biomarker_sample_id) REFERENCES biomarker_samples (id)
            );
            CREATE INDEX IF NOT EXISTS idx_biomarker_results_sample
                ON biomarker_results (biomarker_sample_id, created_at);",
            kind: MigrationKind::Up,
        },
    ]
}

/// Resolve a caller-supplied RELATIVE path to an absolute path inside the app's
/// managed data directory, rejecting anything that could escape it (absolute paths
/// or a `..` component). Shared path-traversal guard for the file commands.
fn resolve_managed_path(
    app: &tauri::AppHandle,
    relative_path: &str,
) -> Result<std::path::PathBuf, String> {
    use std::path::{Component, Path};
    use tauri::Manager;

    let rel = Path::new(relative_path);
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
    Ok(base.join(rel))
}

/// Copy a user-picked image into the app's managed data directory.
///
/// This is the ONLY filesystem-write capability exposed to the webview, and it is
/// deliberately narrow: the frontend supplies the source path (a file the user
/// explicitly chose via the OS dialog) and a caller-controlled RELATIVE path; the
/// destination is always resolved under `app_local_data_dir`, so the webview can
/// never write outside the app's own storage.
#[tauri::command]
fn attach_image_file(
    app: tauri::AppHandle,
    source_path: String,
    relative_path: String,
) -> Result<(), String> {
    let dest = resolve_managed_path(&app, &relative_path)?;
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Could not prepare the storage folder: {e}"))?;
    }
    std::fs::copy(&source_path, &dest)
        .map_err(|e| format!("Could not save the image: {e}"))?;
    Ok(())
}

/// Remove managed image files (best-effort) after their database rows are deleted.
/// Each path is validated by `resolve_managed_path`, so only files inside the app's
/// own storage can be removed. A path that is already gone is not an error.
#[tauri::command]
fn delete_managed_files(
    app: tauri::AppHandle,
    relative_paths: Vec<String>,
) -> Result<(), String> {
    for relative_path in relative_paths {
        let target = resolve_managed_path(&app, &relative_path)?;
        if target.exists() {
            std::fs::remove_file(&target)
                .map_err(|e| format!("Could not remove {relative_path}: {e}"))?;
        }
    }
    Ok(())
}

/// Read the raw bytes of a managed file (used to embed images in exported reports).
/// The path is validated by `resolve_managed_path`, so only files inside the app's
/// own managed storage can be read — the webview can never read arbitrary files.
#[tauri::command]
fn read_managed_file(app: tauri::AppHandle, relative_path: String) -> Result<Vec<u8>, String> {
    let source = resolve_managed_path(&app, &relative_path)?;
    std::fs::read(&source).map_err(|e| format!("Could not read {relative_path}: {e}"))
}

/// One export file: a plain filename plus its raw bytes.
#[derive(serde::Deserialize)]
struct ExportFileArg {
    name: String,
    bytes: Vec<u8>,
}

/// Write export files into a user-chosen destination directory.
///
/// Unlike `attach_image_file` (which stays inside the app's managed storage), export
/// writes to a location the researcher explicitly picked via the OS folder dialog —
/// that is the point of an export. To stay safe, each `name` must be a PLAIN file
/// name: any path separator or `..` component is rejected, so files can only land
/// directly in the chosen directory.
#[tauri::command]
fn write_export_files(
    directory: String,
    files: Vec<ExportFileArg>,
) -> Result<(), String> {
    use std::path::{Component, Path};

    let dir = Path::new(&directory);
    for file in files {
        let name_path = Path::new(&file.name);
        let is_plain_name = name_path.components().count() == 1
            && matches!(name_path.components().next(), Some(Component::Normal(_)));
        if !is_plain_name {
            return Err(format!("Invalid export file name: {}", file.name));
        }
        let target = dir.join(&file.name);
        std::fs::write(&target, &file.bytes)
            .map_err(|e| format!("Could not write {}: {e}", file.name))?;
    }
    Ok(())
}

/// On a FRESH install, seed the bundled sample dataset so the app opens with data to
/// explore. Copies the bundled seed database into the app's config directory (where
/// the SQL plugin opens it) and the bundled managed images into the app's local-data
/// `images` folder — but ONLY when they don't already exist, so an existing user's
/// real data is never touched. Best-effort: any failure is logged and ignored so the
/// app still starts (just without the sample data).
fn seed_bundled_data(app: &tauri::AppHandle) {
    use std::fs;
    use tauri::{path::BaseDirectory, Manager};

    // 1. Database — copy the bundled seed DB when the app has no database yet.
    if let Ok(config_dir) = app.path().app_config_dir() {
        let db = config_dir.join("als_research_companion.db");
        if !db.exists() {
            let _ = fs::create_dir_all(&config_dir);
            if let Ok(seed) =
                app.path().resolve("seed/als_research_companion.db", BaseDirectory::Resource)
            {
                if seed.exists() {
                    if let Err(e) = fs::copy(&seed, &db) {
                        eprintln!("Could not seed sample database: {e}");
                    }
                }
            }
        }
    }

    // 2. Managed images — copy the bundled images when there is no images folder yet.
    if let Ok(local_dir) = app.path().app_local_data_dir() {
        let images = local_dir.join("images");
        if !images.exists() {
            let _ = fs::create_dir_all(&images);
            if let Ok(seed_images) = app.path().resolve("seed/images", BaseDirectory::Resource) {
                if let Ok(entries) = fs::read_dir(&seed_images) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(name) = path.file_name() {
                                let _ = fs::copy(&path, images.join(name));
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            seed_bundled_data(app.handle());
            Ok(())
        })
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            attach_image_file,
            delete_managed_files,
            write_export_files,
            read_managed_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running the ALS Research Companion application");
}
