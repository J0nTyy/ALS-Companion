/**
 * Runtime environment detection.
 * ----------------------------------------------------------------------------
 * The same React bundle can run in two contexts:
 *   1. Inside the Tauri desktop shell (full access to SQLite + the file system).
 *   2. In a plain browser during `npm run dev` preview (no desktop backend).
 *
 * Screens use these helpers to degrade honestly instead of crashing when a
 * desktop-only capability is unavailable.
 */

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export type RuntimeKind = "desktop" | "browser-preview";

export function getRuntimeKind(): RuntimeKind {
  return isTauri() ? "desktop" : "browser-preview";
}
