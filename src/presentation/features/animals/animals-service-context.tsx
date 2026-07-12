import { createContext, useContext, type ReactNode } from "react";

import type { AnimalsService } from "@/application/services/animals-service";

const AnimalsServiceContext = createContext<AnimalsService | null>(null);

/**
 * Injects the animals service into the tree. The concrete instance is built in
 * the composition root and passed in at the app entry point, so components
 * depend on the {@link AnimalsService} interface — never on SQLite.
 */
export function AnimalsServiceProvider({
  service,
  children,
}: {
  service: AnimalsService;
  children: ReactNode;
}) {
  return (
    <AnimalsServiceContext.Provider value={service}>
      {children}
    </AnimalsServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnimalsService(): AnimalsService {
  const service = useContext(AnimalsServiceContext);
  if (!service) {
    throw new Error(
      "useAnimalsService must be used within an AnimalsServiceProvider",
    );
  }
  return service;
}
