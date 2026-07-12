import { useCallback, useEffect, useState } from "react";

import type {
  ResearchAsset,
  ResearchAssetOwnerType,
} from "@/domain/entities/research-asset";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useResearchAssetService } from "./research-asset-service-context";

export type ResearchAssetsState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; assets: ResearchAsset[] };

/**
 * Loads the research assets (metadata only) for an owner. In the browser preview
 * it never touches the database — it reports "unavailable" so the UI degrades
 * honestly.
 */
export function useResearchAssets(
  ownerType: ResearchAssetOwnerType,
  ownerId: string,
) {
  const service = useResearchAssetService();
  const [state, setState] = useState<ResearchAssetsState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const assets = await service.listByOwner(ownerType, ownerId);
      setState({ status: "ready", assets });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the research assets. Please try again.",
        ),
      });
    }
  }, [service, ownerType, ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
