import type { StoredFile } from "@/domain/entities/stored-file";
import type { StorageRepository } from "@/application/ports/storage-repository";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import type { MRISessionReader } from "@/application/ports/mri-session-repository";
import { NotFoundError } from "@/application/errors";
import { loadWritableAssetOwner } from "./load-writable-asset-owner";

/**
 * Confirm that a stored image exists and can be written to (used before creating,
 * editing, or deleting an annotation on it). Walks the parent chain
 * `StoredFile → ResearchAsset → owner (e.g. MRISession) → TimelineEvent → Animal
 * → Study`, reusing {@link loadWritableAssetOwner} for the owner-and-below hops:
 * the file and its research asset must exist, and the owning study must not be
 * archived.
 *
 * @returns the resolved {@link StoredFile}.
 * @throws NotFoundError if the file or its research asset is missing.
 * @throws StudyArchivedError if the owning study is archived.
 */
export async function loadWritableStoredFile(
  deps: {
    storage: StorageRepository;
    researchAssets: ResearchAssetRepository;
    mriSessions: MRISessionReader;
    timelineEvents: TimelineEventReader;
    animals: AnimalReader;
    studies: StudyReader;
  },
  storedFileId: string,
): Promise<StoredFile> {
  const file = await deps.storage.getById(storedFileId);
  if (!file) {
    throw new NotFoundError("That image could not be found.");
  }

  const asset = await deps.researchAssets.getById(file.researchAssetId);
  if (!asset) {
    throw new NotFoundError("That image's research asset could not be found.");
  }

  await loadWritableAssetOwner(deps, asset.ownerType, asset.ownerId);
  return file;
}
