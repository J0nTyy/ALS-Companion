# ALS Research Companion

A calm, **local-first desktop application** for planning, tracking, and reviewing
**ALS transgenic mouse studies** — built for researchers, not engineers.

> This is a **research-productivity tool, not a diagnostic or clinical system.** It
> never diagnoses, grades, or stages disease. All data stays on the researcher's
> computer — no accounts, no telemetry, no cloud.

## Features

- **Studies** — create, edit, and archive research studies (cohort + protocol).
- **Animals** — a per-study registry with study-unique IDs, sex, date of birth,
  mutation/genotype, and free-text treatment groups.
- **Longitudinal observations** — dated body weights (grams) and motor scores on a
  named scale, with repeated measurements kept.
- **Experiment timeline** — a chronological workflow log per animal (gene
  confirmation, assessments, MRI, biochemical analysis, histopathology, custom),
  planned or completed.
- **Protocol templates** — a reusable per-study protocol that new animals inherit
  as their timeline.
- **MRI sessions** — imaging-session metadata attached to MRI timeline events.
- **Research assets & image storage** — attach and view PNG/JPEG/TIFF images against
  a research asset, behind a strict Content-Security-Policy and a sandboxed asset
  protocol scoped to the app's own storage.
- **MRI comparison workspace** — view two sessions side-by-side with synchronized
  zoom/pan.
- **Universal search** — find any entity by text and filters.
- **Dashboard** — a home screen summarizing the current research state (current
  study, today's work, quick stats, recent activity) from existing data.

## Tech stack

Tauri v2 (Rust backend) · React 18 · TypeScript (strict) · Vite 6 · Tailwind CSS ·
shadcn/ui · SQLite (via `@tauri-apps/plugin-sql`) · Vitest.

## Getting started

```bash
npm install         # install dependencies
npm run dev         # browser preview at http://localhost:1420
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Frontend preview in the browser. |
| `npm run typecheck` | Strict TypeScript check (both tsconfigs). |
| `npm run test` | Unit tests (Vitest). |
| `npm run build` | Type-check + production bundle to `dist/`. |
| `npm run lint` | ESLint. |
| `npm run tauri dev` | Run the full desktop app *(needs Rust — see below)*. |
| `npm run tauri build` | Build a distributable desktop app. |

### Running the desktop app (prerequisites)

The desktop shell needs the **Rust toolchain** and generated **app icons**:

1. Install Visual Studio Build Tools 2022 with the **Desktop development with C++**
   workload.
2. Install Rust via [rustup](https://www.rust-lang.org/tools/install)
   (`winget install --id Rustlang.Rustup -e`), then reopen your terminal and verify
   `rustc --version` / `cargo --version`.
3. Generate icons from a 1024×1024 PNG source: `npm run tauri icon path/to/source.png`.
4. Launch: `npm run tauri dev`.

## Architecture

The frontend follows **Clean Architecture** — dependencies point inward only
(`presentation → application → domain`), with `infrastructure` implementing
application ports:

```
src/
├── domain/          Entities & pure business rules (zero framework dependencies)
├── application/     Use cases, ports (interfaces), and service facades
├── infrastructure/  Adapters — the only layer that imports Tauri/SQLite
├── composition/     Wiring root: builds adapters and injects them into services
├── presentation/    React features, layouts, and UI components
└── shared/          Cross-cutting utilities, hooks, config

src-tauri/           Rust backend: SQLite schema (append-only migrations), commands,
                     window & bundle config, security (CSP + asset protocol)
```

Each layer under `src/` has a `README.md` describing its boundaries. The database
schema is defined once as append-only migrations in `src-tauri/src/lib.rs`; the
frontend never issues SQL directly.

## Testing sample data

Developer scripts under `scripts/` generate a labelled example dataset (real
CC-licensed sample imagery + generated documents) and seed it into a local database
for testing. See `scripts/make-sample-media.py` and `scripts/seed-sample-data.py`.

## Status

Actively developed. Frontend checks (typecheck, tests, lint, build) pass; some
desktop-only flows are verified by launching the packaged app.
