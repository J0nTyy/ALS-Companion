/**
 * Composition root for the Observations feature.
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters and injects them into the
 * application service. Safe to import in the browser preview — the repositories
 * connect to SQLite lazily, so no database access happens until a method runs.
 */
import {
  createObservationsService,
  type ObservationsService,
} from "@/application/services/observations-service";
import { SqliteObservationRepository } from "@/infrastructure/repositories/sqlite-observation-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemCalendar } from "@/infrastructure/system/system-calendar";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const observationsService: ObservationsService =
  createObservationsService({
    repository: new SqliteObservationRepository(),
    // Read-only parent lookups for existence / study / archived checks.
    animals: new SqliteAnimalRepository(),
    studies: new SqliteStudyRepository(),
    calendar: systemCalendar,
    clock: systemClock,
    ids: uuidIdGenerator,
  });
