/**
 * Lightweight "remember where I was" tracker. Records the last study / animal detail
 * route the researcher visited (in localStorage) so the Dashboard can offer to
 * resume it. Gated by the `rememberLastWorkspace` setting; never records anything
 * else, and stores only an in-app route + a coarse label (no record contents).
 */
const KEY = "als.last-workspace";

export interface LastWorkspace {
  path: string;
  label: string;
}

const ANIMAL_RE = /^\/studies\/[^/]+\/animals\/[^/]+$/;
const STUDY_RE = /^\/studies\/[^/]+$/;

/** Classify a path into a resumable workspace, or null if it isn't one. */
export function workspaceForPath(path: string): LastWorkspace | null {
  if (ANIMAL_RE.test(path)) return { path, label: "the animal you were viewing" };
  if (STUDY_RE.test(path)) return { path, label: "the study you were viewing" };
  return null;
}

export function recordWorkspacePath(path: string, enabled: boolean): void {
  if (!enabled) return;
  const ws = workspaceForPath(path);
  if (!ws) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ws));
  } catch {
    // best-effort
  }
}

export function readLastWorkspace(): LastWorkspace | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastWorkspace;
    return typeof parsed?.path === "string" && workspaceForPath(parsed.path)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function clearLastWorkspace(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
