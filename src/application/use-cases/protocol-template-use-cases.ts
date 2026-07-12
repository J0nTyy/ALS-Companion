import type {
  NewProtocolStepInput,
  ProtocolStep,
  ProtocolTemplate,
  ProtocolWithSteps,
  UpdateProtocolStepInput,
} from "@/domain/entities/protocol-template";
import { ConflictError, NotFoundError, ValidationError } from "@/application/errors";
import type { ProtocolTemplateUseCaseDeps } from "./deps";
import { assertStudyWritable } from "./assert-study-writable";
import { loadWritableTemplate } from "./load-writable-template";
import {
  validateProtocolName,
  validateProtocolStepFields,
} from "./validate-protocol-input";

/** Get a study's protocol with its ordered steps, or null if none exists. */
export async function getProtocol(
  deps: ProtocolTemplateUseCaseDeps,
  studyId: string,
): Promise<ProtocolWithSteps | null> {
  const template = await deps.repository.findByStudy(studyId);
  if (!template) return null;
  const steps = await deps.repository.listStepsByTemplate(template.id);
  return { template, steps };
}

/** Create a study's protocol (one per study). */
export async function createProtocol(
  deps: ProtocolTemplateUseCaseDeps,
  input: { studyId: string; name?: string },
): Promise<ProtocolTemplate> {
  await assertStudyWritable(deps.studies, input.studyId);
  if (await deps.repository.findByStudy(input.studyId)) {
    throw new ConflictError("This study already has a protocol.");
  }
  const { name } = validateProtocolName(input);
  const now = deps.clock.now();
  const template: ProtocolTemplate = {
    id: deps.ids.next(),
    studyId: input.studyId,
    name,
    createdAt: now,
    updatedAt: now,
  };
  await deps.repository.createTemplate(template);
  return template;
}

/** Rename a study's protocol. */
export async function updateProtocol(
  deps: ProtocolTemplateUseCaseDeps,
  input: { id: string; name?: string },
): Promise<ProtocolTemplate> {
  const template = await loadWritableTemplate(deps, input.id);
  const { name } = validateProtocolName(input);
  const updated: ProtocolTemplate = {
    ...template,
    name,
    updatedAt: deps.clock.now(),
  };
  await deps.repository.updateTemplate(updated);
  return updated;
}

/** List a template's steps in display order. */
export async function listProtocolSteps(
  deps: ProtocolTemplateUseCaseDeps,
  templateId: string,
): Promise<ProtocolStep[]> {
  return deps.repository.listStepsByTemplate(templateId);
}

/** Add a step to a protocol (appended at the end of the current order). */
export async function addProtocolStep(
  deps: ProtocolTemplateUseCaseDeps,
  input: NewProtocolStepInput,
): Promise<ProtocolStep> {
  await loadWritableTemplate(deps, input.protocolTemplateId);
  const fields = validateProtocolStepFields(input);
  const existing = await deps.repository.listStepsByTemplate(
    input.protocolTemplateId,
  );
  const now = deps.clock.now();
  const step: ProtocolStep = {
    id: deps.ids.next(),
    protocolTemplateId: input.protocolTemplateId,
    title: fields.title,
    category: fields.category,
    offsetDays: fields.offsetDays,
    displayOrder: existing.length,
    createdAt: now,
    updatedAt: now,
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };
  await deps.repository.createStep(step);
  return step;
}

/** Edit an existing protocol step. */
export async function updateProtocolStep(
  deps: ProtocolTemplateUseCaseDeps,
  input: UpdateProtocolStepInput,
): Promise<ProtocolStep> {
  const existing = await deps.repository.getStepById(input.id);
  if (!existing) {
    throw new NotFoundError("That protocol step could not be found.");
  }
  await loadWritableTemplate(deps, existing.protocolTemplateId);
  const fields = validateProtocolStepFields(input);
  const updated: ProtocolStep = {
    ...existing,
    title: fields.title,
    category: fields.category,
    offsetDays: fields.offsetDays,
    updatedAt: deps.clock.now(),
  };
  if (fields.notes !== undefined) {
    updated.notes = fields.notes;
  } else {
    delete updated.notes;
  }
  await deps.repository.updateStep(updated);
  return updated;
}

/**
 * Remove a step from a template. This never touches timeline events already
 * generated for animals — they are independent research records.
 */
export async function removeProtocolStep(
  deps: ProtocolTemplateUseCaseDeps,
  id: string,
): Promise<void> {
  const existing = await deps.repository.getStepById(id);
  if (!existing) {
    throw new NotFoundError("That protocol step could not be found.");
  }
  await loadWritableTemplate(deps, existing.protocolTemplateId);
  await deps.repository.deleteStep(id);
}

/** Reorder a template's steps to match `orderedStepIds`, returning the new order. */
export async function reorderProtocolSteps(
  deps: ProtocolTemplateUseCaseDeps,
  input: { templateId: string; orderedStepIds: readonly string[] },
): Promise<ProtocolStep[]> {
  await loadWritableTemplate(deps, input.templateId);
  const steps = await deps.repository.listStepsByTemplate(input.templateId);
  const existingIds = new Set(steps.map((step) => step.id));
  const sameLength = input.orderedStepIds.length === steps.length;
  const allBelong = input.orderedStepIds.every((id) => existingIds.has(id));
  if (!sameLength || !allBelong) {
    throw new ValidationError(
      "The reordered steps don't match this protocol.",
    );
  }
  await deps.repository.reorderSteps(
    input.templateId,
    input.orderedStepIds,
    deps.clock.now(),
  );
  return deps.repository.listStepsByTemplate(input.templateId);
}
