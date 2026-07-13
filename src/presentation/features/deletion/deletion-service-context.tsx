import { createContext, useContext, type ReactNode } from "react";

import type { DeletionService } from "@/application/services/deletion-service";

const DeletionServiceContext = createContext<DeletionService | null>(null);

/**
 * Injects the deletion service (cascading, owner-authorized permanent deletes) into
 * the tree. Components depend on the {@link DeletionService} interface — never on
 * SQLite or the filesystem. Every caller gates the action behind a confirmation.
 */
export function DeletionServiceProvider({
  service,
  children,
}: {
  service: DeletionService;
  children: ReactNode;
}) {
  return (
    <DeletionServiceContext.Provider value={service}>
      {children}
    </DeletionServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDeletionService(): DeletionService {
  const service = useContext(DeletionServiceContext);
  if (!service) {
    throw new Error(
      "useDeletionService must be used within a DeletionServiceProvider",
    );
  }
  return service;
}
