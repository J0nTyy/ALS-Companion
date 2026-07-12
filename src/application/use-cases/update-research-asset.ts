import type {
  ResearchAsset,
  UpdateResearchAssetInput,
} from "@/domain/entities/research-asset";
import { NotFoundError } from "@/application/errors";
import type { ResearchAssetUseCaseDeps } from "./deps";
import { loadWritableAssetOwner } from "./load-writable-asset-owner";
import { validateResearchAssetFields } from "./validate-research-asset-input";

/**
 * Apply researcher edits to an existing research asset's metadata.
 *
 * Loads the asset (preserving its owner and creation time), verifies the owner's
 * study is still writable (exists and not archived), validates the metadata,
 * refreshes the modification time, and persists. Clearing the description removes
 * it. Metadata only — no file operations.
 */
export async function updateResearchAsset(
  deps: ResearchAssetUseCaseDeps,
  input: UpdateResearchAssetInput,
): Promise<ResearchAsset> {
  const existing = await deps.repository.getById(input.id);
  if (!existing) {
    throw new NotFoundError("That research asset could not be found.");
  }

  await loadWritableAssetOwner(deps, existing.ownerType, existing.ownerId);

  const fields = validateResearchAssetFields(input);

  const updated: ResearchAsset = {
    ...existing,
    assetType: fields.assetType,
    title: fields.title,
    status: fields.status,
    updatedAt: deps.clock.now(),
  };

  if (fields.description !== undefined) {
    updated.description = fields.description;
  } else {
    delete updated.description;
  }

  await deps.repository.update(updated);
  return updated;
}
