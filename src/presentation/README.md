# Presentation Layer

Everything the researcher sees and touches: the app shell, screens (organized as
`features/`), reusable components, and the `components/ui` design-system
primitives (shadcn/ui).

## Structure

- `components/ui/` — unstyled-logic primitives (Button, Card, Badge, …). Owned
  by the design system; keep them generic.
- `components/` — app-specific shared components (page header, empty state,
  navigation, theme toggle).
- `layouts/` — structural shells (sidebar + content).
- `features/<name>/` — one folder per screen/feature. A feature may have its own
  components, hooks, and view-models.

## Rules

- Reaches data through application use cases / ports, injected via hooks — never
  by constructing SQLite queries inline.
- Keep components reusable and free of engineering jargon in user-facing copy.
