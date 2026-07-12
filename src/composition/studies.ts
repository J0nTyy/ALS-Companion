/**
 * Composition root for the Studies feature.
 * ----------------------------------------------------------------------------
 * This is the one place allowed to know about every layer: it constructs the
 * concrete infrastructure adapters (SQLite repository, system clock, UUID
 * generator) and injects them into the application service. Everything else
 * depends on interfaces only.
 *
 * The repository connects to SQLite lazily, so importing this module is safe in
 * the browser preview — no database access happens until a method is called.
 */
import {
  createStudiesService,
  type StudiesService,
} from "@/application/services/studies-service";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const studiesService: StudiesService = createStudiesService({
  repository: new SqliteStudyRepository(),
  clock: systemClock,
  ids: uuidIdGenerator,
});
