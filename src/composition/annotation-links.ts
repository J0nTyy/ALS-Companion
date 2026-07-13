/**
 * Composition root for longitudinal Annotation Links (v1.7).
 * ----------------------------------------------------------------------------
 * Wires the SQLite link repository + the read-only annotation-context reader into
 * the AnnotationLinkService. Safe to import in the browser preview (adapters
 * connect to SQLite lazily). Links are researcher-created; nothing here infers
 * correspondence.
 */
import {
  createAnnotationLinkService,
  type AnnotationLinkService,
} from "@/application/services/annotation-link-service";
import { SqliteAnnotationLinkRepository } from "@/infrastructure/repositories/sqlite-annotation-link-repository";
import { SqliteAnnotationContextReader } from "@/infrastructure/repositories/sqlite-annotation-context-reader";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const annotationLinkService: AnnotationLinkService =
  createAnnotationLinkService({
    repository: new SqliteAnnotationLinkRepository(),
    context: new SqliteAnnotationContextReader(),
    clock: systemClock,
    ids: uuidIdGenerator,
  });
