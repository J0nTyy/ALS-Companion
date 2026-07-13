import { createContext, useContext, type ReactNode } from "react";

import type { AnnotationService } from "@/application/services/annotation-service";

const AnnotationServiceContext = createContext<AnnotationService | null>(null);

/**
 * Injects the annotation service into the tree. The concrete instance is built in
 * the composition root and passed in at the app entry point, so components depend
 * on the {@link AnnotationService} interface — never on SQLite.
 */
export function AnnotationServiceProvider({
  service,
  children,
}: {
  service: AnnotationService;
  children: ReactNode;
}) {
  return (
    <AnnotationServiceContext.Provider value={service}>
      {children}
    </AnnotationServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnnotationService(): AnnotationService {
  const service = useContext(AnnotationServiceContext);
  if (!service) {
    throw new Error(
      "useAnnotationService must be used within an AnnotationServiceProvider",
    );
  }
  return service;
}
