import type { TimelineEventCategory } from "@/domain/entities/timeline-event";

/**
 * Domain entities: ProtocolTemplate and ProtocolStep
 * ----------------------------------------------------------------------------
 * A reusable experimental protocol defined once per {@link Study}. When a new
 * {@link Animal} is created in that study, its experiment timeline is seeded from
 * the protocol's steps. Framework-free: no React, SQLite, or Tauri.
 *
 * Editing a protocol is a template change: it affects **only newly created
 * animals**. Existing animals' timeline events are never modified when the
 * protocol changes — they are independent research records.
 *
 * A protocol step maps directly onto a timeline event, so its `category` reuses
 * the {@link TimelineEventCategory} vocabulary.
 */

export interface ProtocolTemplate {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The study this protocol belongs to (exactly one per study). */
  readonly studyId: string;
  /** Short researcher-facing name, e.g. "Standard SOD1 survival protocol". */
  name: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

export interface ProtocolStep {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The template this step belongs to. */
  readonly protocolTemplateId: string;
  /** Short title, becomes the generated timeline event's title. */
  title: string;
  /** Which workflow category — reuses the timeline event categories. */
  category: TimelineEventCategory;
  /**
   * Days after the animal's creation date this step is planned for. A
   * non-negative integer (0 = the day the animal is added).
   */
  offsetDays: number;
  /** Optional free-text notes, copied onto the generated timeline event. */
  notes?: string;
  /** Position within the protocol (ascending). Managed by the app. */
  displayOrder: number;
  readonly createdAt: string;
  updatedAt: string;
}

/** Fields a researcher provides when adding a step. */
export type NewProtocolStepInput = {
  protocolTemplateId: string;
  title: string;
  category: TimelineEventCategory;
  offsetDays: number;
} & Partial<Pick<ProtocolStep, "notes">>;

/** Fields a researcher can change when editing a step. */
export type UpdateProtocolStepInput = Pick<
  ProtocolStep,
  "id" | "title" | "category" | "offsetDays"
> &
  Partial<Pick<ProtocolStep, "notes">>;

/** A protocol with its ordered steps — the "Get Protocol" shape. */
export interface ProtocolWithSteps {
  template: ProtocolTemplate;
  steps: ProtocolStep[];
}

/** True when `value` is a valid step offset: a non-negative integer. */
export function isValidOffsetDays(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
