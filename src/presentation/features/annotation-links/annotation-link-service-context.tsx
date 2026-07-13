import { createContext, useContext, type ReactNode } from "react";

import type { AnnotationLinkService } from "@/application/services/annotation-link-service";

const AnnotationLinkServiceContext =
  createContext<AnnotationLinkService | null>(null);

/**
 * Injects the annotation-link service (researcher-created longitudinal links) into
 * the tree. Components depend on the {@link AnnotationLinkService} interface — never
 * on SQLite.
 */
export function AnnotationLinkServiceProvider({
  service,
  children,
}: {
  service: AnnotationLinkService;
  children: ReactNode;
}) {
  return (
    <AnnotationLinkServiceContext.Provider value={service}>
      {children}
    </AnnotationLinkServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnnotationLinkService(): AnnotationLinkService {
  const service = useContext(AnnotationLinkServiceContext);
  if (!service) {
    throw new Error(
      "useAnnotationLinkService must be used within an AnnotationLinkServiceProvider",
    );
  }
  return service;
}
