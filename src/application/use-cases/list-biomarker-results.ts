import type { BiomarkerResult } from "@/domain/entities/biomarker-result";
import type { BiomarkerUseCaseDeps } from "./deps";

/** List a sample's biomarker results, in entry order (oldest first). */
export async function listBiomarkerResults(
  deps: BiomarkerUseCaseDeps,
  biomarkerSampleId: string,
): Promise<BiomarkerResult[]> {
  return deps.results.listBySample(biomarkerSampleId);
}
