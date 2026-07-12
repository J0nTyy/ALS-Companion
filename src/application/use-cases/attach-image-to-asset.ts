import type { StoredFile } from "@/domain/entities/stored-file";
import {
  fileExtension,
  imageFormatForFileName,
} from "@/domain/entities/stored-file";
import { NotFoundError, ValidationError } from "@/application/errors";
import type { StorageUseCaseDeps } from "./deps";
import { loadWritableAssetOwner } from "./load-writable-asset-owner";

/**
 * Attach an image file to an existing research asset.
 *
 * Flow: the asset must exist and its study must be writable; the researcher picks
 * a file (cancelling resolves to `null`); the format must be PNG/JPEG/TIFF; the
 * file is copied into managed storage under a stable, collision-free relative path;
 * the {@link StoredFile} metadata is recorded; and finally — only after a
 * successful copy — the asset's status is flipped to "attached" (a system-
 * controlled transition, never manual). Used for both first attach and "replace"
 * (a replace simply attaches a newer file; the most recent is the current image).
 *
 * @returns the new StoredFile, or `null` if the researcher cancelled the picker.
 * @throws NotFoundError if the asset is missing.
 * @throws StudyArchivedError if the owning study is archived.
 * @throws ValidationError if the chosen file is not a supported image.
 */
export async function attachImageToAsset(
  deps: StorageUseCaseDeps,
  researchAssetId: string,
): Promise<StoredFile | null> {
  const asset = await deps.researchAssets.getById(researchAssetId);
  if (!asset) {
    throw new NotFoundError("That research asset could not be found.");
  }

  await loadWritableAssetOwner(deps, asset.ownerType, asset.ownerId);

  const picked = await deps.filePicker.pickImage();
  if (!picked) return null;

  const format = imageFormatForFileName(picked.name);
  if (!format) {
    throw new ValidationError(
      "That file type isn't supported yet. Please choose a PNG, JPEG, or TIFF image.",
      "file",
    );
  }

  const id = deps.ids.next();
  const ext = fileExtension(picked.name);
  const relativePath = `images/${id}.${ext}`;

  // Copy the bytes first; only record + flip status if the copy succeeds.
  await deps.fileStore.save({ sourcePath: picked.path, relativePath });

  const now = deps.clock.now();
  const file: StoredFile = {
    id,
    researchAssetId,
    storageType: "local_managed",
    relativePath,
    originalName: picked.name,
    mimeType: format.mime,
    createdAt: now,
  };
  await deps.storage.create(file);

  if (asset.status !== "attached") {
    await deps.researchAssets.update({
      ...asset,
      status: "attached",
      updatedAt: now,
    });
  }

  return file;
}
