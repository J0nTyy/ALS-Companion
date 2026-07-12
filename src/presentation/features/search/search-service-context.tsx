import { createContext, useContext, type ReactNode } from "react";

import type { SearchService } from "@/application/services/search-service";

const SearchServiceContext = createContext<SearchService | null>(null);

/**
 * Injects the global search service into the tree. The concrete instance is built
 * in the composition root and passed in at the app entry point, so components
 * depend on the {@link SearchService} interface — never on SQLite.
 */
export function SearchServiceProvider({
  service,
  children,
}: {
  service: SearchService;
  children: ReactNode;
}) {
  return (
    <SearchServiceContext.Provider value={service}>
      {children}
    </SearchServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearchService(): SearchService {
  const service = useContext(SearchServiceContext);
  if (!service) {
    throw new Error(
      "useSearchService must be used within a SearchServiceProvider",
    );
  }
  return service;
}
