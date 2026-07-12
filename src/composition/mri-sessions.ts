/**
 * Composition root for the MRI Sessions feature.
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters and injects them into the
 * application service. Safe to import in the browser preview — the repositories
 * connect to SQLite lazily, so no database access happens until a method runs.
 */
import {
  createMriSessionService,
  type MriSessionService,
} from "@/application/services/mri-session-service";
import { SqliteMriSessionRepository } from "@/infrastructure/repositories/sqlite-mri-session-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const mriSessionsService: MriSessionService = createMriSessionService({
  repository: new SqliteMriSessionRepository(),
  // Read-only parent lookups: the timeline event must exist, and its animal's
  // study must not be archived (TimelineEvent → Animal → Study).
  timelineEvents: new SqliteTimelineEventRepository(),
  animals: new SqliteAnimalRepository(),
  studies: new SqliteStudyRepository(),
  clock: systemClock,
  ids: uuidIdGenerator,
});
