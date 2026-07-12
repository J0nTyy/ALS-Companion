/**
 * Composition root for the global Search feature (the app's navigation layer).
 * ----------------------------------------------------------------------------
 * Builds the concrete SQLite repositories and injects them into the
 * {@link SearchService} as narrow, read-only search readers. Each repository
 * already implements its own `XSearchReader` port, so the same adapters that
 * power the feature verticals also power search — no separate data path.
 *
 * Safe to import in the browser preview: the repositories connect to SQLite
 * lazily, so no database access happens until a search runs.
 */
import {
  createSearchService,
  type SearchService,
} from "@/application/services/search-service";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteProtocolTemplateRepository } from "@/infrastructure/repositories/sqlite-protocol-template-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteMriSessionRepository } from "@/infrastructure/repositories/sqlite-mri-session-repository";
import { SqliteObservationRepository } from "@/infrastructure/repositories/sqlite-observation-repository";
import { SqliteResearchAssetRepository } from "@/infrastructure/repositories/sqlite-research-asset-repository";

export const searchService: SearchService = createSearchService({
  studies: new SqliteStudyRepository(),
  animals: new SqliteAnimalRepository(),
  protocols: new SqliteProtocolTemplateRepository(),
  timelineEvents: new SqliteTimelineEventRepository(),
  mriSessions: new SqliteMriSessionRepository(),
  observations: new SqliteObservationRepository(),
  researchAssets: new SqliteResearchAssetRepository(),
});
