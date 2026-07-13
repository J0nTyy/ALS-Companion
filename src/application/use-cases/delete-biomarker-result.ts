import { NotFoundError } from "@/application/errors";
import type { BiomarkerUseCaseDeps } from "./deps";
import { loadWritableBiomarkerSample } from "./load-writable-biomarker-sample";

/**
 * Permanently delete a single biomarker result.
 *
 * Confirms the result exists and its sample's study is not archived (archived
 * studies are read-only), then removes the row. Idempotent at the repository level.
 */
export async function deleteBiomarkerResult(
  deps: BiomarkerUseCaseDeps,
  id: string,
): Promise<void> {
  const existing = await deps.results.getById(id);
  if (!existing) {
    throw new NotFoundError("That biomarker result could not be found.");
  }

  await loadWritableBiomarkerSample(deps, existing.biomarkerSampleId);
  await deps.results.delete(id);
}
