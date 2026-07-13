/**
 * Composition root for the Biomarker & Molecular Analysis feature (v2.0).
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters (sample + result repositories)
 * and injects them, with the read-only parent chain (TimelineEvent → Animal →
 * Study) used to keep archived studies read-only, into the BiomarkerService. Safe
 * to import in the browser preview — the repositories connect to SQLite lazily.
 */
import {
  createBiomarkerService,
  type BiomarkerService,
} from "@/application/services/biomarker-service";
import { SqliteBiomarkerSampleRepository } from "@/infrastructure/repositories/sqlite-biomarker-sample-repository";
import { SqliteBiomarkerResultRepository } from "@/infrastructure/repositories/sqlite-biomarker-result-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const biomarkerService: BiomarkerService = createBiomarkerService({
  samples: new SqliteBiomarkerSampleRepository(),
  results: new SqliteBiomarkerResultRepository(),
  // Read-only parent chain for the writable (archived) check.
  timelineEvents: new SqliteTimelineEventRepository(),
  animals: new SqliteAnimalRepository(),
  studies: new SqliteStudyRepository(),
  clock: systemClock,
  ids: uuidIdGenerator,
});
