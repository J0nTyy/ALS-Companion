import type {
  NewResearchAssetInput,
  ResearchAsset,
} from "@/domain/entities/research-asset";
import type { ResearchAssetUseCaseDeps } from "./deps";
import { loadWritableAssetOwner } from "./load-writable-asset-owner";
import { validateResearchAssetFields } from "./validate-research-asset-input";

/**
 * Create a research-asset placeholder attached to an owner (e.g. an MRI session).
 *
 * Verifies the owner exists and its study is not archived, validates the metadata,
 * generates id/timestamps via injected services, persists, and returns the entity.
 * Stores metadata ONLY — no file is read, uploaded, or referenced by path.
 */
export async function createResearchAsset(
  deps: ResearchAssetUseCaseDeps,
  input: NewResearchAssetInput,
): Promise<ResearchAsset> {
  await loadWritableAssetOwner(deps, input.ownerType, input.ownerId);

  const fields = validateResearchAssetFields(input);
  const now = deps.clock.now();

  const asset: ResearchAsset = {
    id: deps.ids.next(),
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    assetType: fields.assetType,
    title: fields.title,
    status: fields.status,
    createdAt: now,
    updatedAt: now,
    ...(fields.description !== undefined
      ? { description: fields.description }
      : {}),
  };

  await deps.repository.create(asset);
  return asset;
}
