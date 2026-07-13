/**
 * Composition root for the image Storage feature (v1.0).
 * ----------------------------------------------------------------------------
 * Builds the concrete adapters — the SQLite metadata repository, the Tauri file
 * store (scoped copy + asset-protocol URLs) and the Tauri file picker — plus the
 * read-only parent chain used to keep archived studies read-only, and injects
 * them into the {@link StorageService}.
 *
 * Safe to import in the browser preview: the SQLite repositories connect lazily
 * and the Tauri adapters are guarded by `isTauri()`, so nothing touches the
 * database or filesystem until a method runs on the desktop.
 */
import {
  createStorageService,
  type StorageService,
} from "@/application/services/storage-service";
import { SqliteStorageRepository } from "@/infrastructure/repositories/sqlite-storage-repository";
import { SqliteResearchAssetRepository } from "@/infrastructure/repositories/sqlite-research-asset-repository";
import { SqliteMriSessionRepository } from "@/infrastructure/repositories/sqlite-mri-session-repository";
import { SqliteHistologySessionRepository } from "@/infrastructure/repositories/sqlite-histology-session-repository";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";
import { TauriFileStore } from "@/infrastructure/storage/tauri-file-store";
import { TauriFilePicker } from "@/infrastructure/storage/tauri-file-picker";
import { systemClock } from "@/infrastructure/system/system-clock";
import { uuidIdGenerator } from "@/infrastructure/system/uuid-id-generator";

export const storageService: StorageService = createStorageService({
  storage: new SqliteStorageRepository(),
  fileStore: new TauriFileStore(),
  filePicker: new TauriFilePicker(),
  researchAssets: new SqliteResearchAssetRepository(),
  // Read-only parent chain for the writable-owner (archived) check.
  mriSessions: new SqliteMriSessionRepository(),
  histologySessions: new SqliteHistologySessionRepository(),
  timelineEvents: new SqliteTimelineEventRepository(),
  animals: new SqliteAnimalRepository(),
  studies: new SqliteStudyRepository(),
  clock: systemClock,
  ids: uuidIdGenerator,
});
