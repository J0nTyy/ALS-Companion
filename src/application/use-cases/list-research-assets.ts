import type {
  ResearchAsset,
  ResearchAssetOwnerType,
} from "@/domain/entities/research-asset";
import type { ResearchAssetUseCaseDeps } from "./deps";

/** List an owner's research assets, newest first. */
export async function listResearchAssets(
  deps: ResearchAssetUseCaseDeps,
  ownerType: ResearchAssetOwnerType,
  ownerId: string,
): Promise<ResearchAsset[]> {
  return deps.repository.listByOwner(ownerType, ownerId);
}
