import { createContext, useContext, type ReactNode } from "react";

import type { ProtocolTemplateService } from "@/application/services/protocol-template-service";

const ProtocolServiceContext = createContext<ProtocolTemplateService | null>(
  null,
);

/**
 * Injects the protocol service into the tree. The concrete instance is built in
 * the composition root and passed in at the app entry point, so components depend
 * on the {@link ProtocolTemplateService} interface — never on SQLite.
 */
export function ProtocolServiceProvider({
  service,
  children,
}: {
  service: ProtocolTemplateService;
  children: ReactNode;
}) {
  return (
    <ProtocolServiceContext.Provider value={service}>
      {children}
    </ProtocolServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProtocolService(): ProtocolTemplateService {
  const service = useContext(ProtocolServiceContext);
  if (!service) {
    throw new Error(
      "useProtocolService must be used within a ProtocolServiceProvider",
    );
  }
  return service;
}
