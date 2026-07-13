import type {
  BiomarkerSample,
  NewBiomarkerSampleInput,
  UpdateBiomarkerSampleInput,
} from "@/domain/entities/biomarker-sample";
import type {
  BiomarkerResult,
  NewBiomarkerResultInput,
  UpdateBiomarkerResultInput,
} from "@/domain/entities/biomarker-result";
import type { BiomarkerUseCaseDeps } from "@/application/use-cases/deps";
import { createBiomarkerSample } from "@/application/use-cases/create-biomarker-sample";
import { updateBiomarkerSample } from "@/application/use-cases/update-biomarker-sample";
import { deleteBiomarkerSample } from "@/application/use-cases/delete-biomarker-sample";
import { listBiomarkerSamples } from "@/application/use-cases/list-biomarker-samples";
import { createBiomarkerResult } from "@/application/use-cases/create-biomarker-result";
import { updateBiomarkerResult } from "@/application/use-cases/update-biomarker-result";
import { deleteBiomarkerResult } from "@/application/use-cases/delete-biomarker-result";
import { listBiomarkerResults } from "@/application/use-cases/list-biomarker-results";

/**
 * Facade the presentation layer depends on for biomarker operations — both samples
 * and their results. Hides the use-case functions and their dependency bundle;
 * presentation talks to this interface, never to a repository or SQL. Deleting a
 * sample cascades to its results in the application layer.
 */
export interface BiomarkerService {
  listSamples(timelineEventId: string): Promise<BiomarkerSample[]>;
  createSample(input: NewBiomarkerSampleInput): Promise<BiomarkerSample>;
  updateSample(input: UpdateBiomarkerSampleInput): Promise<BiomarkerSample>;
  deleteSample(id: string): Promise<void>;

  listResults(biomarkerSampleId: string): Promise<BiomarkerResult[]>;
  createResult(input: NewBiomarkerResultInput): Promise<BiomarkerResult>;
  updateResult(input: UpdateBiomarkerResultInput): Promise<BiomarkerResult>;
  deleteResult(id: string): Promise<void>;
}

/** Bind a dependency bundle to the biomarker use cases to produce a service. */
export function createBiomarkerService(
  deps: BiomarkerUseCaseDeps,
): BiomarkerService {
  return {
    listSamples: (timelineEventId) =>
      listBiomarkerSamples(deps, timelineEventId),
    createSample: (input) => createBiomarkerSample(deps, input),
    updateSample: (input) => updateBiomarkerSample(deps, input),
    deleteSample: (id) => deleteBiomarkerSample(deps, id),

    listResults: (biomarkerSampleId) =>
      listBiomarkerResults(deps, biomarkerSampleId),
    createResult: (input) => createBiomarkerResult(deps, input),
    updateResult: (input) => updateBiomarkerResult(deps, input),
    deleteResult: (id) => deleteBiomarkerResult(deps, id),
  };
}
