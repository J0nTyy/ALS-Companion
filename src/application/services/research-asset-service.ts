import type {
  NewResearchAssetInput,
  ResearchAsset,
  ResearchAssetOwnerType,
  UpdateResearchAssetInput,
} from "@/domain/entities/research-asset";
import type { ResearchAssetUseCaseDeps } from "@/application/use-cases/deps";
import { createResearchAsset } from "@/application/use-cases/create-research-asset";
import { updateResearchAsset } from "@/application/use-cases/update-research-asset";
import { getResearchAsset } from "@/application/use-cases/get-research-asset";
import { listResearchAssets } from "@/application/use-cases/list-research-assets";

/**
 * Facade the presentation layer depends on for research-asset operations. Hides
 * the use-case functions and their dependency bundle; presentation talks to this
 * interface — never to the repository or SQL. Metadata only — no file operations.
 */
export interface ResearchAssetService {
  listByOwner(
    ownerType: ResearchAssetOwnerType,
    ownerId: string,
  ): Promise<ResearchAsset[]>;
  get(id: string): Promise<ResearchAsset | null>;
  create(input: NewResearchAssetInput): Promise<ResearchAsset>;
  update(input: UpdateResearchAssetInput): Promise<ResearchAsset>;
}

/** Bind a dependency bundle to the research-asset use cases to produce a service. */
export function createResearchAssetService(
  deps: ResearchAssetUseCaseDeps,
): ResearchAssetService {
  return {
    listByOwner: (ownerType, ownerId) =>
      listResearchAssets(deps, ownerType, ownerId),
    get: (id) => getResearchAsset(deps, id),
    create: (input) => createResearchAsset(deps, input),
    update: (input) => updateResearchAsset(deps, input),
  };
}
