import type {
  NewProtocolStepInput,
  ProtocolStep,
  ProtocolTemplate,
  ProtocolWithSteps,
  UpdateProtocolStepInput,
} from "@/domain/entities/protocol-template";
import type { ProtocolTemplateUseCaseDeps } from "@/application/use-cases/deps";
import {
  addProtocolStep,
  createProtocol,
  getProtocol,
  listProtocolSteps,
  removeProtocolStep,
  reorderProtocolSteps,
  updateProtocol,
  updateProtocolStep,
} from "@/application/use-cases/protocol-template-use-cases";

/**
 * Facade the presentation layer depends on for protocol operations. Hides the
 * use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL.
 */
export interface ProtocolTemplateService {
  getForStudy(studyId: string): Promise<ProtocolWithSteps | null>;
  createProtocol(input: {
    studyId: string;
    name?: string;
  }): Promise<ProtocolTemplate>;
  updateProtocol(input: { id: string; name?: string }): Promise<ProtocolTemplate>;
  listSteps(templateId: string): Promise<ProtocolStep[]>;
  addStep(input: NewProtocolStepInput): Promise<ProtocolStep>;
  updateStep(input: UpdateProtocolStepInput): Promise<ProtocolStep>;
  reorderSteps(input: {
    templateId: string;
    orderedStepIds: readonly string[];
  }): Promise<ProtocolStep[]>;
  removeStep(id: string): Promise<void>;
}

/** Bind a dependency bundle to the protocol use cases to produce a service. */
export function createProtocolTemplateService(
  deps: ProtocolTemplateUseCaseDeps,
): ProtocolTemplateService {
  return {
    getForStudy: (studyId) => getProtocol(deps, studyId),
    createProtocol: (input) => createProtocol(deps, input),
    updateProtocol: (input) => updateProtocol(deps, input),
    listSteps: (templateId) => listProtocolSteps(deps, templateId),
    addStep: (input) => addProtocolStep(deps, input),
    updateStep: (input) => updateProtocolStep(deps, input),
    reorderSteps: (input) => reorderProtocolSteps(deps, input),
    removeStep: (id) => removeProtocolStep(deps, id),
  };
}
