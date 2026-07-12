# Application Layer

Orchestrates the domain to fulfill user goals. Contains **use cases** (e.g.
"create study", "record daily observation") and **ports** — interfaces that
describe what the application needs from the outside world (e.g. a
`StudyRepository`).

## Rules

- May depend on `domain` only.
- Declares interfaces (ports); it must **not** know how they are implemented.
- Infrastructure provides concrete implementations of these ports (dependency
  inversion). This keeps SQLite/Tauri details out of business logic.

If a file here imports from `infrastructure` or `presentation`, that is an
architecture violation.
