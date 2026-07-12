# Infrastructure Layer

Adapters to the outside world: SQLite access via the Tauri SQL plugin, file
system access, runtime/environment detection, and concrete implementations of
the ports declared in `application`.

## Rules

- May depend on `domain` and `application`.
- The **only** layer allowed to import from `@tauri-apps/*`.
- Presentation talks to infrastructure through application ports, never by
  reaching into these modules directly for business data.
