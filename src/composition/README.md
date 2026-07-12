# Composition Root

The wiring layer (the "main" component in Clean Architecture). This is the only
place permitted to import from every layer at once: it constructs concrete
`infrastructure` adapters and injects them into `application` services, then
hands the resulting service interfaces to the presentation layer.

## Rules

- May import from any layer — but only to **construct and wire**, never to add
  behavior. No business logic lives here.
- Presentation receives services from here as application-defined interfaces
  (e.g. `StudiesService`), so it still depends on abstractions, not on SQLite.
- Keep it thin. If a file here is doing more than `new X(...)` wiring, the logic
  belongs in `application` or `infrastructure`.
