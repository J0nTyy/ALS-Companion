import { createContext, useContext, type ReactNode } from "react";

import type { MriSessionService } from "@/application/services/mri-session-service";

const MriSessionServiceContext = createContext<MriSessionService | null>(null);

/**
 * Injects the MRI-session service into the tree. The concrete instance is built
 * in the composition root and passed in at the app entry point, so components
 * depend on the {@link MriSessionService} interface — never on SQLite.
 */
export function MriSessionServiceProvider({
  service,
  children,
}: {
  service: MriSessionService;
  children: ReactNode;
}) {
  return (
    <MriSessionServiceContext.Provider value={service}>
      {children}
    </MriSessionServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMriSessionService(): MriSessionService {
  const service = useContext(MriSessionServiceContext);
  if (!service) {
    throw new Error(
      "useMriSessionService must be used within a MriSessionServiceProvider",
    );
  }
  return service;
}
