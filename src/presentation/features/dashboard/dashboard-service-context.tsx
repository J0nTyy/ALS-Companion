import { createContext, useContext, type ReactNode } from "react";

import type { DashboardService } from "@/application/services/dashboard-service";

const DashboardServiceContext = createContext<DashboardService | null>(null);

/**
 * Injects the dashboard orchestration service into the tree. The concrete instance
 * is built in the composition root, so the dashboard depends on the
 * {@link DashboardService} interface — never on SQLite or other services directly.
 */
export function DashboardServiceProvider({
  service,
  children,
}: {
  service: DashboardService;
  children: ReactNode;
}) {
  return (
    <DashboardServiceContext.Provider value={service}>
      {children}
    </DashboardServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboardService(): DashboardService {
  const service = useContext(DashboardServiceContext);
  if (!service) {
    throw new Error(
      "useDashboardService must be used within a DashboardServiceProvider",
    );
  }
  return service;
}
