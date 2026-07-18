import type {
  NewStudyInput,
  Study,
  UpdateStudyInput,
} from "@/domain/entities/study";
import type { StudyListOptions } from "@/application/ports/study-repository";
import type { StudyUseCaseDeps } from "@/application/use-cases/deps";
import { createStudy } from "@/application/use-cases/create-study";
import { updateStudy } from "@/application/use-cases/update-study";
import { archiveStudy } from "@/application/use-cases/archive-study";
import { listStudies } from "@/application/use-cases/list-studies";
import { getStudy } from "@/application/use-cases/get-study";
import { setStudySummary } from "@/application/use-cases/set-study-summary";

/**
 * A small facade the presentation layer depends on. It exposes study operations
 * as plain async methods, hiding the use-case functions and their dependency
 * bundle. Presentation talks to this interface — never to the repository or SQL.
 */
export interface StudiesService {
  list(options?: StudyListOptions): Promise<Study[]>;
  get(id: string): Promise<Study | null>;
  create(input: NewStudyInput): Promise<Study>;
  update(input: UpdateStudyInput): Promise<Study>;
  /** Set or clear the study's narrative report summary (for exports). */
  setSummary(id: string, summary: string): Promise<Study>;
  archive(id: string): Promise<void>;
}

/** Bind a dependency bundle to the study use cases to produce a service. */
export function createStudiesService(
  deps: StudyUseCaseDeps,
): StudiesService {
  return {
    list: (options) => listStudies(deps, options),
    get: (id) => getStudy(deps, id),
    create: (input) => createStudy(deps, input),
    update: (input) => updateStudy(deps, input),
    setSummary: (id, summary) => setStudySummary(deps, id, summary),
    archive: (id) => archiveStudy(deps, id),
  };
}
