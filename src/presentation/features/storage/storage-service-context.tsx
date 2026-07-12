import { createContext, useContext, type ReactNode } from "react";

import type { StorageService } from "@/application/services/storage-service";

const StorageServiceContext = createContext<StorageService | null>(null);

/**
 * Injects the image-storage service into the tree. The concrete instance is built
 * in the composition root and passed in at the app entry point, so components
 * depend on the {@link StorageService} interface — never on Tauri, the filesystem,
 * or SQLite.
 */
export function StorageServiceProvider({
  service,
  children,
}: {
  service: StorageService;
  children: ReactNode;
}) {
  return (
    <StorageServiceContext.Provider value={service}>
      {children}
    </StorageServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStorageService(): StorageService {
  const service = useContext(StorageServiceContext);
  if (!service) {
    throw new Error(
      "useStorageService must be used within a StorageServiceProvider",
    );
  }
  return service;
}
