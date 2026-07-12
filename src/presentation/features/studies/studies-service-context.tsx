import { createContext, useContext, type ReactNode } from "react";

import type { StudiesService } from "@/application/services/studies-service";

const StudiesServiceContext = createContext<StudiesService | null>(null);

/**
 * Injects the studies service into the tree. The concrete instance is built in
 * the composition root and passed in at the app entry point, so components
 * depend on the {@link StudiesService} interface — never on SQLite.
 */
export function StudiesServiceProvider({
  service,
  children,
}: {
  service: StudiesService;
  children: ReactNode;
}) {
  return (
    <StudiesServiceContext.Provider value={service}>
      {children}
    </StudiesServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStudiesService(): StudiesService {
  const service = useContext(StudiesServiceContext);
  if (!service) {
    throw new Error(
      "useStudiesService must be used within a StudiesServiceProvider",
    );
  }
  return service;
}
