/**
 * Composition root for the Annotations feature (v1.5).
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters and injects them into the
 * application service. Safe to import in the browser preview — the repositories
 * connect to SQLite lazily, so no database access happens until a method runs.
 *
 * An annotation is drawn on a StoredFile; the storage + research-asset repos and
 * the MRI-session → timeline-event → animal → study reader chain are injected so
 * the use cases can confirm the image exists and its study is not archived before
 * writing (archived studies stay read-only).
 */
import {
  createAnnotationService,
  type AnnotationService,
} from "@/application/services/annotation-service";
import { SqliteAnnotationRepository } from "@/infrastructure/repositories/sqlite-annotation-repository";
import { SqliteStorageRepository } from "@/infrastructure/repositories/sqlite-storage-repository";
import { SqliteResearchAssetRepository } from "@/infrastructure/repositories/sqlite-research-asset-repository";
import { SqliteMriSessionRepository } from "@/infrastructure/repositories/sqlite-mri-session-repository";
import { SqliteHistologySessionRepository } from "@/infrastructure/repositories/sqlite-histology-session-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { SqliteAnnotationLinkRepository } from "@/infrastructure/repositories/sqlite-annotation-link-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const annotationsService: AnnotationService = createAnnotationService({
  repository: new SqliteAnnotationRepository(),
  storage: new SqliteStorageRepository(),
  researchAssets: new SqliteResearchAssetRepository(),
  // Read-only chain to enforce the archived-study read-only rule:
  // StoredFile → ResearchAsset → (MRI|Histology)Session → TimelineEvent → Animal → Study.
  mriSessions: new SqliteMriSessionRepository(),
  histologySessions: new SqliteHistologySessionRepository(),
  timelineEvents: new SqliteTimelineEventRepository(),
  animals: new SqliteAnimalRepository(),
  studies: new SqliteStudyRepository(),
  // Deleting an annotation must first remove its longitudinal links (FK).
  annotationLinks: new SqliteAnnotationLinkRepository(),
  clock: systemClock,
  ids: uuidIdGenerator,
});
