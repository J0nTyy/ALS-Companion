import type { Study } from "@/domain/entities/study";

/**
 * The "current study" is the one the researcher most recently touched that isn't
 * archived (studies arrive newest-updated first), falling back to the most recent
 * overall, or null when there are none. No fabrication — purely a pick.
 */
export function pickCurrentStudy(studies: readonly Study[]): Study | null {
  return studies.find((s) => s.status !== "archived") ?? studies[0] ?? null;
}

/** Real counts derived from the studies list. */
export function countStudies(studies: readonly Study[]): {
  total: number;
  active: number;
  archived: number;
} {
  let active = 0;
  let archived = 0;
  for (const study of studies) {
    if (study.status === "active") active += 1;
    else if (study.status === "archived") archived += 1;
  }
  return { total: studies.length, active, archived };
}
