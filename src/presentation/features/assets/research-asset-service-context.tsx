import { createContext, useContext, type ReactNode } from "react";

import type { ResearchAssetService } from "@/application/services/research-asset-service";

const ResearchAssetServiceContext =
  createContext<ResearchAssetService | null>(null);

/**
 * Injects the research-asset service into the tree. The concrete instance is
 * built in the composition root and passed in at the app entry point, so
 * components depend on the {@link ResearchAssetService} interface — never on
 * SQLite.
 */
export function ResearchAssetServiceProvider({
  service,
  children,
}: {
  service: ResearchAssetService;
  children: ReactNode;
}) {
  return (
    <ResearchAssetServiceContext.Provider value={service}>
      {children}
    </ResearchAssetServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useResearchAssetService(): ResearchAssetService {
  const service = useContext(ResearchAssetServiceContext);
  if (!service) {
    throw new Error(
      "useResearchAssetService must be used within a ResearchAssetServiceProvider",
    );
  }
  return service;
}
