import type { StoredFile } from "@/domain/entities/stored-file";
import type { StorageUseCaseDeps } from "@/application/use-cases/deps";
import { attachImageToAsset } from "@/application/use-cases/attach-image-to-asset";
import {
  getLatestAssetFile,
  getStoredFile,
  listAssetFiles,
  resolveImageUrl,
} from "@/application/use-cases/get-asset-files";

/**
 * Facade the presentation layer depends on for image storage + viewing. It hides
 * ALL filesystem details (copying, paths, the asset protocol) behind this
 * interface — presentation never touches Tauri, the filesystem, or SQL. This is
 * the "StorageService" boundary: research assets stay metadata; the bytes live
 * behind here.
 */
export interface StorageService {
  /** Prompt for and attach an image to an asset; null if the picker was cancelled. */
  attachImage(researchAssetId: string): Promise<StoredFile | null>;
  /** The current (most recent) image for an asset, or null. */
  getLatestFile(researchAssetId: string): Promise<StoredFile | null>;
  /** All files attached to an asset, most recent first. */
  listFiles(researchAssetId: string): Promise<StoredFile[]>;
  /** A single stored file by id, or null. */
  getFile(id: string): Promise<StoredFile | null>;
  /** Resolve a stored relative path to a URL the webview can load in an `<img>`. */
  resolveImageUrl(relativePath: string): Promise<string>;
}

/** Bind a dependency bundle to the storage use cases to produce a service. */
export function createStorageService(
  deps: StorageUseCaseDeps,
): StorageService {
  return {
    attachImage: (researchAssetId) =>
      attachImageToAsset(deps, researchAssetId),
    getLatestFile: (researchAssetId) =>
      getLatestAssetFile(deps, researchAssetId),
    listFiles: (researchAssetId) => listAssetFiles(deps, researchAssetId),
    getFile: (id) => getStoredFile(deps, id),
    resolveImageUrl: (relativePath) => resolveImageUrl(deps, relativePath),
  };
}
