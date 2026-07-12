/**
 * Composition root for the Timeline feature.
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters and injects them into the
 * application service. Safe to import in the browser preview — the repositories
 * connect to SQLite lazily, so no database access happens until a method runs.
 */
import {
  createTimelineEventsService,
  type TimelineEventsService,
} from "@/application/services/timeline-events-service";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const timelineEventsService: TimelineEventsService =
  createTimelineEventsService({
    repository: new SqliteTimelineEventRepository(),
    // Read-only parent lookups for existence / study / archived checks.
    animals: new SqliteAnimalRepository(),
    studies: new SqliteStudyRepository(),
    clock: systemClock,
    ids: uuidIdGenerator,
  });
