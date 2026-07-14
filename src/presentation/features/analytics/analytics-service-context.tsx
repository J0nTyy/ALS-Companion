import { createContext, useContext, type ReactNode } from "react";

import type { AnalyticsService } from "@/application/services/analytics-service";

const AnalyticsServiceContext = createContext<AnalyticsService | null>(null);

/** Injects the read-only analytics service (built in the composition root). */
export function AnalyticsServiceProvider({
  service,
  children,
}: {
  service: AnalyticsService;
  children: ReactNode;
}) {
  return (
    <AnalyticsServiceContext.Provider value={service}>
      {children}
    </AnalyticsServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnalyticsService(): AnalyticsService {
  const service = useContext(AnalyticsServiceContext);
  if (!service) {
    throw new Error(
      "useAnalyticsService must be used within an AnalyticsServiceProvider",
    );
  }
  return service;
}
