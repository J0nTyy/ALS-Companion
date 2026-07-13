/**
 * Domain entity: HistologySession
 * ----------------------------------------------------------------------------
 * A histological imaging session attached to one {@link TimelineEvent} (typically
 * a timeline event of category "histopathology"). It is the histology counterpart
 * of {@link MRISession} and deliberately shares the same shape and rules, so the
 * whole imaging stack (research assets → stored files → viewer → annotations →
 * measurements → longitudinal links → export) is REUSED, not duplicated.
 * Framework-free: no React, SQLite, or Tauri.
 *
 * This milestone stores session **metadata only** — the actual images live behind
 * the existing ResearchAsset → StoredFile abstraction, exactly like MRI.
 *
 * `stain` is a small extensible union. The seed set covers the stains common in ALS
 * histopathology; adding a future stain is a one-line change to `HISTOLOGY_STAINS`
 * (+ its META) — no redesign — because everything keys off the derived union type.
 *
 * NOTE: unlike MRISession there is no free `title` field — a histology session is
 * identified by its stain (+ optional tissue), matching how these are catalogued in
 * the lab. Presentation composes a display label from the stain and tissue.
 */

export const HISTOLOGY_STAINS = [
  "he",
  "nissl",
  "luxol_fast_blue",
  "gfap",
  "iba1",
  "other",
] as const;

export type HistologyStain = (typeof HISTOLOGY_STAINS)[number];

export interface HistologySession {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The timeline event this session belongs to. */
  readonly timelineEventId: string;
  /** Histological stain used (extensible union). */
  stain: HistologyStain;
  /** The day the section was imaged/acquired, as a local `YYYY-MM-DD` string. */
  acquisitionDate: string;
  /** Optional tissue / region, e.g. "Lumbar spinal cord", "Motor cortex". */
  tissue?: string;
  /** Optional magnification, free text, e.g. "20×", "40× oil". */
  magnification?: string;
  /** Optional operator/technician who prepared or imaged the section. */
  operator?: string;
  /** Optional free-text research context. Never a diagnosis or disease stage. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when creating a session. */
export type NewHistologySessionInput = Pick<
  HistologySession,
  "timelineEventId" | "stain" | "acquisitionDate"
> &
  Partial<
    Pick<HistologySession, "tissue" | "magnification" | "operator" | "notes">
  >;

/** Fields a researcher can change when editing a session. */
export type UpdateHistologySessionInput = Pick<
  HistologySession,
  "id" | "stain" | "acquisitionDate"
> &
  Partial<
    Pick<HistologySession, "tissue" | "magnification" | "operator" | "notes">
  >;

/** User-facing labels for each stain (researcher terminology). */
export const HISTOLOGY_STAIN_META: Record<HistologyStain, { label: string }> = {
  he: { label: "H&E" },
  nissl: { label: "Nissl" },
  luxol_fast_blue: { label: "Luxol Fast Blue" },
  gfap: { label: "GFAP" },
  iba1: { label: "Iba1" },
  other: { label: "Other" },
};

export function isHistologyStain(value: unknown): value is HistologyStain {
  return (
    typeof value === "string" &&
    (HISTOLOGY_STAINS as readonly string[]).includes(value)
  );
}

/**
 * A short researcher-facing label for a session, since there is no title column.
 * Combines the stain label with the tissue when present, e.g. "H&E · Lumbar cord".
 */
export function histologySessionLabel(session: HistologySession): string {
  const stain = HISTOLOGY_STAIN_META[session.stain].label;
  return session.tissue ? `${stain} · ${session.tissue}` : stain;
}
