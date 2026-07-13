/**
 * Composition root for the Research Assets feature.
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters and injects them into the
 * application service. Safe to import in the browser preview — the repositories
 * connect to SQLite lazily, so no database access happens until a method runs.
 *
 * A research asset is metadata only; nothing here reads, uploads, or references a
 * file. The MRI-session reader (plus its timeline-event/animal/study chain) is
 * injected so the use cases can confirm the owner exists and its study is not
 * archived before writing.
 */
import {
  createResearchAssetService,
  type ResearchAssetService,
} from "@/application/services/research-asset-service";
import { SqliteResearchAssetRepository } from "@/infrastructure/repositories/sqlite-research-asset-repository";
import { SqliteMriSessionRepository } from "@/infrastructure/repositories/sqlite-mri-session-repository";
import { SqliteHistologySessionRepository } from "@/infrastructure/repositories/sqlite-histology-session-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const researchAssetsService: ResearchAssetService =
  createResearchAssetService({
    repository: new SqliteResearchAssetRepository(),
    // Read-only owner lookup: the writable-parent check dispatches on owner type
    // and walks Session → TimelineEvent → Animal → Study (MRI or histology).
    mriSessions: new SqliteMriSessionRepository(),
    histologySessions: new SqliteHistologySessionRepository(),
    timelineEvents: new SqliteTimelineEventRepository(),
    animals: new SqliteAnimalRepository(),
    studies: new SqliteStudyRepository(),
    clock: systemClock,
    ids: uuidIdGenerator,
  });
