# ALS Research Companion

A calm, **local-first desktop application** for planning, tracking, reviewing, and
reporting **ALS transgenic mouse studies** — built for biomedical researchers, not
engineers.

> **Research-productivity tool, not a diagnostic or clinical system.** It never
> diagnoses, grades, or stages disease and makes no clinical recommendations. All
> data stays on the researcher's computer — **no accounts, no telemetry, no cloud.**

It replaces scattered spreadsheets, folders, and notes with one unified workspace
that follows the real laboratory workflow: **Study → Animals → Observations &
Timeline → MRI sessions → Images → Annotations → Longitudinal links → Report.**

---

## Features

**Studies & cohort**
- **Studies** — create, edit, and **archive** studies (archived studies are fully
  read-only until restored). Permanent **cascading delete** is available too, gated
  behind an explicit type-the-name confirmation.
- **Animals** — a per-study registry with study-unique IDs, sex, date of birth,
  mutation/genotype (SOD1, TDP-43, FUS, C9orf72, …), and free-text treatment groups.
- **Protocol templates** — a reusable per-study protocol that each new animal
  inherits as its starting timeline.

**Data capture**
- **Longitudinal observations** — dated body weights (grams) and motor scores on a
  named scale; repeated measurements are always kept, never merged.
- **Experiment timeline** — a chronological workflow log per animal (gene
  confirmation, behavioral/neurological assessment, MRI, biochemical analysis,
  histopathology, custom), planned or completed with one-click "mark complete".

**Imaging & analysis**
- **MRI sessions & research assets** — imaging-session metadata plus described file
  assets on MRI timeline events.
- **Image storage & viewer** — attach and view PNG/JPEG/TIFF against an asset, behind
  a strict Content-Security-Policy and a sandboxed asset protocol scoped to the app's
  own storage. Zoom, pan, fit, **full-screen** precision viewing, and a live cursor
  read-out.
- **Annotations** — draw **point** and **rectangle** marks on an image, label them,
  add notes, and **drag/resize** to adjust.
- **Live ROI measurements** — position, size, area, perimeter, aspect ratio, and
  centre are **computed on the fly** from the geometry (never stored).
- **Longitudinal annotation links** — connect the same structure across MRI sessions
  (Baseline / Follow-up / Related) to study progression over time — researcher-created,
  never auto-inferred.
- **MRI comparison workspace** — view two sessions side by side with synchronized
  zoom/pan; annotations linked across the two sessions are highlighted together.

**Find, summarize & share**
- **Universal search** — find any entity by text and rich filters.
- **Dashboard** — a home screen summarizing the current research state (current study,
  today's work, quick stats, recent activity) from real data only.
- **Publication workspace** — assemble a structured research package from a study.
- **Export & report engine** — export the package to **PDF**, **DOCX**, **CSV**, or
  **JSON** (stable schema for downstream analysis/AI). PDF and DOCX are generated with
  no third-party document libraries.

**Experience**
- Desktop-style **right-click context menus** throughout (the browser menu is
  suppressed everywhere except editable text fields, so copy/paste still works).
- Light / dark / system themes, a collapsible sidebar, and keyboard shortcuts.

---

## Design principles

- **Local-first & private** — everything lives in a local SQLite database and a
  managed image folder on the researcher's machine.
- **Honest by default** — no fabricated data, honest empty states, and clear
  loading/error handling everywhere.
- **Archive, don't delete** — finished work is archived (reversible); deletion is the
  explicit, confirmed exception.
- **Derive, don't duplicate** — measurements are computed from annotations, exports
  are rendered from one publication package; nothing derived is persisted twice.
- **Append-only schema** — the database evolves only through additive migrations.

## Tech stack

Tauri v2 (Rust backend) · React 18 · TypeScript (strict) · Vite 6 · Tailwind CSS ·
shadcn/ui · SQLite (via `@tauri-apps/plugin-sql`) · Vitest.

The PDF and DOCX exporters are **dependency-free** (a small hand-written PDF writer
and an OOXML `.docx` packager), keeping the bundle lean and the output deterministic.

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

> The browser preview runs the UI, but features that need the local database or
> filesystem (saving data, attaching/viewing images, annotations, export) are only
> available in the installed **desktop** app and show a friendly "desktop app" notice
> in the browser.

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
├── domain/          Entities & pure logic (zero framework dependencies)
├── application/     Use cases, ports (interfaces), service facades, export engine
├── infrastructure/  Adapters — the only layer that imports Tauri/SQLite
├── composition/     Wiring root: builds adapters and injects them into services
├── presentation/    React features, layouts, and UI components
└── shared/          Cross-cutting utilities, hooks, config

src-tauri/           Rust backend: SQLite schema (append-only migrations), narrow
                     custom commands, window & bundle config, security (CSP + asset
                     protocol)
```

The data model mirrors the workflow:

```
Study → Animal → { Observation, TimelineEvent → MRISession → ResearchAsset →
        StoredFile → Annotation → AnnotationLink }
```

The schema is defined once as append-only migrations in `src-tauri/src/lib.rs`; the
presentation layer never issues SQL directly. Cross-cutting reads use dedicated
read-model ports; measurements are derived by a pure engine and never persisted.

## Documentation

- **[USER_GUIDE.md](USER_GUIDE.md)** — a complete, plain-language guide to every
  feature for researchers.
- Each architectural layer under `src/` (`domain`, `application`, `infrastructure`,
  `composition`, `presentation`) has its own `README.md` describing its boundaries.

## Testing sample data

Developer scripts under `scripts/` generate a labelled example dataset (real
CC-licensed sample imagery + generated documents) and seed it into a local database
for testing. See `scripts/make-sample-media.py` and `scripts/seed-sample-data.py`.

## Status

Actively developed. Frontend checks — `typecheck`, `test` (Vitest), `lint`, `build` —
and `cargo check` all pass; some desktop-only flows are verified by launching the
packaged app.
