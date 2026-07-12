/**
 * Composition root for the Protocol Templates feature.
 * ----------------------------------------------------------------------------
 * Constructs the concrete infrastructure adapters and injects them into the
 * application service. Safe to import in the browser preview — the repository
 * connects to SQLite lazily, so no database access happens until a method runs.
 */
import {
  createProtocolTemplateService,
  type ProtocolTemplateService,
} from "@/application/services/protocol-template-service";
import { SqliteProtocolTemplateRepository } from "@/infrastructure/repositories/sqlite-protocol-template-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const protocolTemplatesService: ProtocolTemplateService =
  createProtocolTemplateService({
    repository: new SqliteProtocolTemplateRepository(),
    // Read-only study lookups keep an archived study's protocol read-only.
    studies: new SqliteStudyRepository(),
    clock: systemClock,
    ids: uuidIdGenerator,
  });
