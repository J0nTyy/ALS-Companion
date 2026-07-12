# Domain Layer

The innermost layer. Contains **entities**, **value objects**, and pure business
rules for ALS research concepts (studies, subjects, observations, protocols).

## Rules

- **No dependencies** on React, Tauri, SQLite, or any other layer.
- Only plain TypeScript. Everything here must be unit-testable in isolation.
- Defines the vocabulary the rest of the app speaks.

If a file here imports from `application`, `infrastructure`, or `presentation`,
that is an architecture violation.
