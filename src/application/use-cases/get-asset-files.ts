import type { StoredFile } from "@/domain/entities/stored-file";
import type { StorageUseCaseDeps } from "./deps";

/** All stored files for a research asset, most recent first. */
export function listAssetFiles(
  deps: StorageUseCaseDeps,
  researchAssetId: string,
): Promise<StoredFile[]> {
  return deps.storage.listByAsset(researchAssetId);
}

/** The current (most recently attached) image for a research asset, or null. */
export function getLatestAssetFile(
  deps: StorageUseCaseDeps,
  researchAssetId: string,
): Promise<StoredFile | null> {
  return deps.storage.getLatestByAsset(researchAssetId);
}

/** A single stored file by id, or null. */
export function getStoredFile(
  deps: StorageUseCaseDeps,
  id: string,
): Promise<StoredFile | null> {
  return deps.storage.getById(id);
}

/** Resolve a stored file's relative path to a URL the webview can load. */
export function resolveImageUrl(
  deps: StorageUseCaseDeps,
  relativePath: string,
): Promise<string> {
  return deps.fileStore.resolveDisplayUrl(relativePath);
}
