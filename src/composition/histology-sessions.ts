/**
 * Composition root for the Histology Sessions feature (v1.9).
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters and injects them into the
 * application service. Mirrors the MRI-sessions root — a histology session hangs
 * off a timeline event, so the read-only parent chain (TimelineEvent → Animal →
 * Study) is injected to keep archived studies read-only. Safe to import in the
 * browser preview — the repositories connect to SQLite lazily.
 */
import {
  createHistologySessionService,
  type HistologySessionService,
} from "@/application/services/histology-session-service";
import { SqliteHistologySessionRepository } from "@/infrastructure/repositories/sqlite-histology-session-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const histologySessionsService: HistologySessionService =
  createHistologySessionService({
    repository: new SqliteHistologySessionRepository(),
    // Read-only parent lookups: the timeline event must exist, and its animal's
    // study must not be archived (TimelineEvent → Animal → Study).
    timelineEvents: new SqliteTimelineEventRepository(),
    animals: new SqliteAnimalRepository(),
    studies: new SqliteStudyRepository(),
    clock: systemClock,
    ids: uuidIdGenerator,
  });
