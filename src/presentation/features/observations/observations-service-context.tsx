import { createContext, useContext, type ReactNode } from "react";

import type { ObservationsService } from "@/application/services/observations-service";

const ObservationsServiceContext = createContext<ObservationsService | null>(
  null,
);

/**
 * Injects the observations service into the tree. The concrete instance is built
 * in the composition root and passed in at the app entry point, so components
 * depend on the {@link ObservationsService} interface — never on SQLite.
 */
export function ObservationsServiceProvider({
  service,
  children,
}: {
  service: ObservationsService;
  children: ReactNode;
}) {
  return (
    <ObservationsServiceContext.Provider value={service}>
      {children}
    </ObservationsServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useObservationsService(): ObservationsService {
  const service = useContext(ObservationsServiceContext);
  if (!service) {
    throw new Error(
      "useObservationsService must be used within an ObservationsServiceProvider",
    );
  }
  return service;
}
