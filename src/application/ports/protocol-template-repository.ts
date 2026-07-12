import type {
  ProtocolStep,
  ProtocolTemplate,
} from "@/domain/entities/protocol-template";

/**
 * Narrow read-only view used during **animal creation** to seed the new animal's
 * timeline from the study's protocol — without granting the animal use cases the
 * full protocol write surface.
 */
export interface ProtocolTemplateReader {
  /** The study's protocol steps in display order, or [] if it has no protocol. */
  listStepsByStudy(studyId: string): Promise<ProtocolStep[]>;
}

/**
 * Port: persistence for {@link ProtocolTemplate} and its {@link ProtocolStep}s.
 *
 * A study has at most one protocol template. Protocol templates/steps are
 * reusable **configuration**, not research records: a step may be removed from a
 * template (this never touches timeline events already generated for animals).
 *
 * **Contract for mutations of existing rows.** `updateTemplate`, `updateStep`,
 * and `deleteStep` MUST NOT report success when no row matched the target id —
 * they must detect "no rows changed" and throw `NotFoundError`.
 */
export interface ProtocolTemplateRepository extends ProtocolTemplateReader {
  /** The study's protocol template, or null if none exists yet. */
  findByStudy(studyId: string): Promise<ProtocolTemplate | null>;

  /** A template by id, or null. */
  getTemplateById(id: string): Promise<ProtocolTemplate | null>;

  /** Persist a brand-new template. */
  createTemplate(template: ProtocolTemplate): Promise<void>;

  /**
   * Persist changes to an existing template (e.g. rename).
   * @throws NotFoundError if no template with `template.id` exists.
   */
  updateTemplate(template: ProtocolTemplate): Promise<void>;

  /** A template's steps in display order. */
  listStepsByTemplate(templateId: string): Promise<ProtocolStep[]>;

  /** A step by id, or null. */
  getStepById(id: string): Promise<ProtocolStep | null>;

  /** Persist a brand-new step. */
  createStep(step: ProtocolStep): Promise<void>;

  /**
   * Persist changes to an existing step.
   * @throws NotFoundError if no step with `step.id` exists.
   */
  updateStep(step: ProtocolStep): Promise<void>;

  /**
   * Remove a step from its template. Does **not** affect timeline events already
   * generated for animals.
   * @throws NotFoundError if no step with `id` exists.
   */
  deleteStep(id: string): Promise<void>;

  /**
   * Reassign `display_order` for the given step ids (index = new order), stamping
   * `updatedAt`. Ids must all belong to `templateId`.
   */
  reorderSteps(
    templateId: string,
    orderedStepIds: readonly string[],
    updatedAt: string,
  ): Promise<void>;
}
