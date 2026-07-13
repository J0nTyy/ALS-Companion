import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";

/**
 * Narrow read-only view of biomarker samples (used to resolve a result's parent
 * chain to the study for the archived-read-only check).
 */
export interface BiomarkerSampleReader {
  getById(id: string): Promise<BiomarkerSample | null>;
}

/**
 * Port: persistence for {@link BiomarkerSample} entities.
 *
 * Implementations receive fully-formed entities (ids/timestamps generated in the
 * application layer). A sample owns its results; deleting a sample removes its
 * results first (in the application layer — the frozen schema has no ON DELETE
 * CASCADE).
 *
 * **Contract for mutations of existing rows.** `update` MUST throw `NotFoundError`
 * when no row matched the target id. `delete` is idempotent.
 */
export interface BiomarkerSampleRepository extends BiomarkerSampleReader {
  /** Samples for a timeline event, most-recently collected first. */
  listByTimelineEvent(timelineEventId: string): Promise<BiomarkerSample[]>;
  getById(id: string): Promise<BiomarkerSample | null>;
  create(sample: BiomarkerSample): Promise<void>;
  /** @throws NotFoundError if no sample with `sample.id` exists. */
  update(sample: BiomarkerSample): Promise<void>;
  /** Idempotent; results are removed first in the app layer. */
  delete(id: string): Promise<void>;
}
