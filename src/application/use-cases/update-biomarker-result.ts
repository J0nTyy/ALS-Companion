import type {
  BiomarkerResult,
  UpdateBiomarkerResultInput,
} from "@/domain/entities/biomarker-result";
import { NotFoundError } from "@/application/errors";
import type { BiomarkerUseCaseDeps } from "./deps";
import { loadWritableBiomarkerSample } from "./load-writable-biomarker-sample";
import { validateBiomarkerResultFields } from "./validate-biomarker-result-input";

/**
 * Apply researcher edits to an existing biomarker result.
 *
 * Loads the result (preserving its sample and creation time), verifies the parent
 * sample's study is still writable (exists and not archived), validates the fields,
 * and persists. Clearing an optional field removes it.
 */
export async function updateBiomarkerResult(
  deps: BiomarkerUseCaseDeps,
  input: UpdateBiomarkerResultInput,
): Promise<BiomarkerResult> {
  const existing = await deps.results.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That biomarker result could not be found.");
  }

  await loadWritableBiomarkerSample(deps, existing.biomarkerSampleId);

  const fields = validateBiomarkerResultFields(input);

  const updated: BiomarkerResult = {
    ...existing,
    biomarkerName: fields.biomarkerName,
    value: fields.value,
  };

  if (fields.unit !== undefined) {
    updated.unit = fields.unit;
  } else {
    delete updated.unit;
  }
  if (fields.method !== undefined) {
    updated.method = fields.method;
  } else {
    delete updated.method;
  }
  if (fields.notes !== undefined) {
    updated.notes = fields.notes;
  } else {
    delete updated.notes;
  }

  await deps.results.update(updated);
  return updated;
}
