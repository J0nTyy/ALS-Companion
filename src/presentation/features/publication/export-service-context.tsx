import { createContext, useContext, type ReactNode } from "react";

import type { ExportService } from "@/application/services/export-service";

const ExportServiceContext = createContext<ExportService | null>(null);

/**
 * Injects the export service into the tree. Components depend on the
 * {@link ExportService} interface — never on the engine internals, Tauri, or the
 * filesystem.
 */
export function ExportServiceProvider({
  service,
  children,
}: {
  service: ExportService;
  children: ReactNode;
}) {
  return (
    <ExportServiceContext.Provider value={service}>
      {children}
    </ExportServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useExportService(): ExportService {
  const service = useContext(ExportServiceContext);
  if (!service) {
    throw new Error(
      "useExportService must be used within an ExportServiceProvider",
    );
  }
  return service;
}
