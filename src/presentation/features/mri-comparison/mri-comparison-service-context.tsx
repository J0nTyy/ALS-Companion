import { createContext, useContext, type ReactNode } from "react";

import type { MriComparisonService } from "@/application/services/mri-comparison-service";

const MriComparisonServiceContext =
  createContext<MriComparisonService | null>(null);

/**
 * Injects the MRI comparison read service into the tree. The concrete instance is
 * built in the composition root, so components depend on the
 * {@link MriComparisonService} interface — never on SQLite.
 */
export function MriComparisonServiceProvider({
  service,
  children,
}: {
  service: MriComparisonService;
  children: ReactNode;
}) {
  return (
    <MriComparisonServiceContext.Provider value={service}>
      {children}
    </MriComparisonServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMriComparisonService(): MriComparisonService {
  const service = useContext(MriComparisonServiceContext);
  if (!service) {
    throw new Error(
      "useMriComparisonService must be used within a MriComparisonServiceProvider",
    );
  }
  return service;
}
