import type { ResearchAsset } from "@/domain/entities/research-asset";
import type { ResearchAssetUseCaseDeps } from "./deps";

/** Fetch a single research asset by id, or null when it does not exist. */
export async function getResearchAsset(
  deps: ResearchAssetUseCaseDeps,
  id: string,
): Promise<ResearchAsset | null> {
  return deps.repository.getById(id);
}
