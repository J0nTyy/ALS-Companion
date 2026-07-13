/**
 * Composition root for cascading deletion (v1.4).
 * ----------------------------------------------------------------------------
 * Builds the SQLite repositories + the Tauri file store and injects them into the
 * DeletionService, which orchestrates children-first deletes and best-effort image
 * removal. Safe to import in the browser preview (adapters connect lazily / are
 * `isTauri`-guarded).
 */
import {
  createDeletionService,
  type DeletionService,
} from "@/application/services/deletion-service";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteObservationRepository } from "@/infrastructure/repositories/sqlite-observation-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteMriSessionRepository } from "@/infrastructure/repositories/sqlite-mri-session-repository";
import { SqliteHistologySessionRepository } from "@/infrastructure/repositories/sqlite-histology-session-repository";
import { SqliteBiomarkerSampleRepository } from "@/infrastructure/repositories/sqlite-biomarker-sample-repository";
import { SqliteBiomarkerResultRepository } from "@/infrastructure/repositories/sqlite-biomarker-result-repository";
import { SqliteResearchAssetRepository } from "@/infrastructure/repositories/sqlite-research-asset-repository";
import { SqliteStorageRepository } from "@/infrastructure/repositories/sqlite-storage-repository";
import { SqliteAnnotationRepository } from "@/infrastructure/repositories/sqlite-annotation-repository";
import { SqliteAnnotationLinkRepository } from "@/infrastructure/repositories/sqlite-annotation-link-repository";
import { SqliteProtocolTemplateRepository } from "@/infrastructure/repositories/sqlite-protocol-template-repository";
import { TauriFileStore } from "@/infrastructure/storage/tauri-file-store";

export const deletionService: DeletionService = createDeletionService({
  studies: new SqliteStudyRepository(),
  animals: new SqliteAnimalRepository(),
  observations: new SqliteObservationRepository(),
  timelineEvents: new SqliteTimelineEventRepository(),
  mriSessions: new SqliteMriSessionRepository(),
  histologySessions: new SqliteHistologySessionRepository(),
  biomarkerSamples: new SqliteBiomarkerSampleRepository(),
  biomarkerResults: new SqliteBiomarkerResultRepository(),
  researchAssets: new SqliteResearchAssetRepository(),
  storage: new SqliteStorageRepository(),
  annotations: new SqliteAnnotationRepository(),
  annotationLinks: new SqliteAnnotationLinkRepository(),
  protocols: new SqliteProtocolTemplateRepository(),
  fileStore: new TauriFileStore(),
});
