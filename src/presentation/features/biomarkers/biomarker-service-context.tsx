import { createContext, useContext, type ReactNode } from "react";

import type { BiomarkerService } from "@/application/services/biomarker-service";

const BiomarkerServiceContext = createContext<BiomarkerService | null>(null);

/**
 * Injects the biomarker service into the tree. The concrete instance is built in
 * the composition root and passed in at the app entry point, so components depend
 * on the {@link BiomarkerService} interface — never on SQLite.
 */
export function BiomarkerServiceProvider({
  service,
  children,
}: {
  service: BiomarkerService;
  children: ReactNode;
}) {
  return (
    <BiomarkerServiceContext.Provider value={service}>
      {children}
    </BiomarkerServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBiomarkerService(): BiomarkerService {
  const service = useContext(BiomarkerServiceContext);
  if (!service) {
    throw new Error(
      "useBiomarkerService must be used within a BiomarkerServiceProvider",
    );
  }
  return service;
}
