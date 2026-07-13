import { createContext, useContext, type ReactNode } from "react";

import type { HistologySessionService } from "@/application/services/histology-session-service";

const HistologySessionServiceContext =
  createContext<HistologySessionService | null>(null);

/**
 * Injects the histology-session service into the tree. The concrete instance is
 * built in the composition root and passed in at the app entry point, so components
 * depend on the {@link HistologySessionService} interface — never on SQLite.
 */
export function HistologySessionServiceProvider({
  service,
  children,
}: {
  service: HistologySessionService;
  children: ReactNode;
}) {
  return (
    <HistologySessionServiceContext.Provider value={service}>
      {children}
    </HistologySessionServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHistologySessionService(): HistologySessionService {
  const service = useContext(HistologySessionServiceContext);
  if (!service) {
    throw new Error(
      "useHistologySessionService must be used within a HistologySessionServiceProvider",
    );
  }
  return service;
}
