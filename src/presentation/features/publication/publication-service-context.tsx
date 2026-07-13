import { createContext, useContext, type ReactNode } from "react";

import type { PublicationWorkspaceService } from "@/application/services/publication-workspace-service";

const PublicationServiceContext =
  createContext<PublicationWorkspaceService | null>(null);

/**
 * Injects the publication workspace service into the tree. The concrete instance
 * is built in the composition root, so components depend on the
 * {@link PublicationWorkspaceService} interface — never on other services or SQL.
 */
export function PublicationServiceProvider({
  service,
  children,
}: {
  service: PublicationWorkspaceService;
  children: ReactNode;
}) {
  return (
    <PublicationServiceContext.Provider value={service}>
      {children}
    </PublicationServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePublicationService(): PublicationWorkspaceService {
  const service = useContext(PublicationServiceContext);
  if (!service) {
    throw new Error(
      "usePublicationService must be used within a PublicationServiceProvider",
    );
  }
  return service;
}
