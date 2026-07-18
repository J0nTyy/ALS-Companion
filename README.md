# ALS Research Companion

A calm, **local-first desktop application** for planning, tracking, reviewing, and
reporting **ALS transgenic mouse studies** — built for biomedical researchers, not
engineers.

> **Research-productivity tool, not a diagnostic or clinical system.** It never
> diagnoses, grades, or stages disease and makes no clinical recommendations. All
> data stays on the researcher's computer — **no accounts, no telemetry, no cloud** —
> with one clearly-labelled, **off-by-default** exception: the optional AI assistant
> (see below) sends a question plus the records it reads to your chosen provider
> (**Google Gemini** or **Groq**) only when you turn it on and add your own key.

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
- **Publication workspace** — assemble a structured research package from a study,
  including an optional **report summary**. The summary editor opens empty each time
  (only what's in it is exported); the last saved summary is kept and reloadable on
  request, and the assistant can **draft one from scratch** or **update it against
  what's changed since the last report**.
- **Export & report engine** — export the package to **PDF**, **DOCX**, **CSV**, or
  **JSON** (stable schema for downstream analysis/AI). A single-file export opens a
  native **Save** dialog so you can name the file (the generated name is pre-filled);
  PDF and DOCX are generated with no third-party document libraries.

**Assistant (optional)**
- **AI assistant** — an opt-in helper that answers questions about your own data and
  how to use the app, and can help you **enter data** and **draft a report summary**.
  It works only through your existing use-cases, so it surfaces real records (never
  fabricated), and **the agent itself never writes** — anything it proposes (an
  observation, timeline event, biomarker result, or a study's report summary) appears
  as a **card you confirm** before it's saved, and it never sends your images.
  - **Bring your own free key** for one of two providers, selectable in Settings:
    **Google Gemini** or **Groq** (higher free rate limits). Keys are held in the OS
    credential store, never in the app or database.
  - It is **page-aware**: it knows which screen and record you're on, so "summarise
    this study" or "what's on this page?" resolve without you spelling it out.
  - Replies render as **formatted Markdown**; on the Publish page a **Draft with
    assistant** button hands it a ready-made prompt for the selected study.
  - **Off by default**, desktop-only, not a diagnostic tool. It opens in a resizable
    **right dock** (toggled from the top bar) — the panel a future plugin manager will
    share. Behind a provider port, so the model backend can change without touching the agent.

**Experience**
- **Two-column detail pages** (study & animal): a wide main column plus a sticky
  summary rail (key facts, live counts, quick actions, and "jump to" links), with
  **collapsible sections** and count badges so large datasets stay scannable.
- Desktop-style **right-click context menus** throughout (the browser menu is
  suppressed everywhere except editable text fields, so copy/paste still works).
- Light / dark / system themes; a **collapsible, resizable** left sidebar and a
  **dockable, resizable right panel** (drag either panel's inner edge — VS Code style;
  the center flexes to fit); and keyboard shortcuts (including in the image viewer:
  `+`/`−` zoom, arrows pan, `0` reset, `F` fit).

---

## Design principles

- **Local-first & private** — everything lives in a local SQLite database and a
  managed image folder on the researcher's machine. The only network feature is the
  optional AI assistant, which is off by default and explicit about what it sends.
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

Key libraries: `pdf-lib` (PDF reports, with **embedded images**) and `docx`
(editable Word reports) — code-split so they load only when you export;
`react-markdown` + `remark-gfm` (the in-app User Guide); `recharts` (analytics
charts); `papaparse` (CSV); `lucide-react` (icons); and self-hosted **Inter** /
**JetBrains Mono** variable fonts (`@fontsource-variable/*`) for on-screen
readability — all bundled locally, so nothing is fetched from a CDN at runtime.

The optional AI assistant calls **Google Gemini** or **Groq** (your choice) through a
narrow Rust command (`reqwest`), so the API key never enters the webview or the bundle
and the request bypasses the webview CSP; the key is stored in the OS credential store
(`keyring`). The assistant sits behind a provider port, so the backend can be swapped
(another provider, a backend proxy, or a local model) without changing the agent loop
or its tools.

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
