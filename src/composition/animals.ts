/**
 * Composition root for the Animals feature.
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters (SQLite repository, system
 * clock, UUID generator) and injects them into the application service. Safe to
 * import in the browser preview — the repository connects to SQLite lazily, so
 * no database access happens until a method is called.
 */
import {
  createAnimalsService,
  type AnimalsService,
} from "@/application/services/animals-service";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteProtocolTemplateRepository } from "@/infrastructure/repositories/sqlite-protocol-template-repository";
import { systemCalendar } from "@/infrastructure/system/system-calendar";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const animalsService: AnimalsService = createAnimalsService({
  repository: new SqliteAnimalRepository(),
  // Read-only study lookups for parent-existence / archived checks.
  studies: new SqliteStudyRepository(),
  // Creating an animal seeds its timeline from the study's protocol:
  protocols: new SqliteProtocolTemplateRepository(),
  timelineEvents: new SqliteTimelineEventRepository(),
  calendar: systemCalendar,
  clock: systemClock,
  ids: uuidIdGenerator,
});
