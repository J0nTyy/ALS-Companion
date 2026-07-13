import type { BiomarkerResult } from "@/domain/entities/biomarker-result";

/**
 * Port: persistence for {@link BiomarkerResult} entities (the laboratory values
 * reported for a {@link BiomarkerSample}).
 *
 * **Contract for mutations of existing rows.** `update` MUST throw `NotFoundError`
 * when no row matched the target id. `delete` is idempotent.
 */
export interface BiomarkerResultRepository {
  /** Results for a sample, oldest first (entry order). */
  listBySample(biomarkerSampleId: string): Promise<BiomarkerResult[]>;
  getById(id: string): Promise<BiomarkerResult | null>;
  create(result: BiomarkerResult): Promise<void>;
  /** @throws NotFoundError if no result with `result.id` exists. */
  update(result: BiomarkerResult): Promise<void>;
  /** Idempotent. */
  delete(id: string): Promise<void>;
}
