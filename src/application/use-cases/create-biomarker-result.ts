import type {
  BiomarkerResult,
  NewBiomarkerResultInput,
} from "@/domain/entities/biomarker-result";
import type { BiomarkerUseCaseDeps } from "./deps";
import { loadWritableBiomarkerSample } from "./load-writable-biomarker-sample";
import { validateBiomarkerResultFields } from "./validate-biomarker-result-input";

/**
 * Add a laboratory result to a biomarker sample.
 *
 * Verifies the parent sample exists and its study is not archived, validates the
 * fields, generates id/timestamp via injected services, persists, and returns the
 * entity. Results carry only a creation timestamp (no `updatedAt`).
 */
export async function createBiomarkerResult(
  deps: BiomarkerUseCaseDeps,
  input: NewBiomarkerResultInput,
): Promise<BiomarkerResult> {
  await loadWritableBiomarkerSample(deps, input.biomarkerSampleId);

  const fields = validateBiomarkerResultFields(input);

  const result: BiomarkerResult = {
    id: deps.ids.next(),
    biomarkerSampleId: input.biomarkerSampleId,
    biomarkerName: fields.biomarkerName,
    value: fields.value,
    createdAt: deps.clock.now(),
    ...(fields.unit !== undefined ? { unit: fields.unit } : {}),
    ...(fields.method !== undefined ? { method: fields.method } : {}),
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.results.create(result);
  return result;
}
