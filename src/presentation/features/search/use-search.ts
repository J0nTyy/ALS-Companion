import { useEffect, useRef, useState } from "react";

import type { SearchQuery } from "@/domain/entities/search";
import type { SearchResults } from "@/application/ports/search";
import { isActionableQuery } from "@/application/use-cases/search/resolve-search-scope";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useSearchService } from "./search-service-context";

export type SearchState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "idle" } // nothing to search yet (no text, no filters)
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; results: SearchResults };

/** How long to wait after the query settles before hitting the database. */
const DEBOUNCE_MS = 250;

/**
 * Runs the global search for a query, debounced. In the browser preview it never
 * touches the database (reports "unavailable"); with no actionable query it stays
 * "idle" so the UI can show a prompt instead of an empty result set. Out-of-order
 * responses are discarded so only the latest query's results are shown.
 */
export function useSearch(query: SearchQuery): SearchState {
  const service = useSearchService();
  const [state, setState] = useState<SearchState>(() =>
    isTauri() ? { status: "idle" } : { status: "unavailable" },
  );
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    if (!isActionableQuery(query)) {
      setState({ status: "idle" });
      return;
    }

    const requestId = ++requestSeq.current;
    setState({ status: "loading" });

    const timer = setTimeout(() => {
      service
        .search(query)
        .then((results) => {
          if (requestSeq.current === requestId) {
            setState({ status: "ready", results });
          }
        })
        .catch((error) => {
          if (requestSeq.current === requestId) {
            setState({
              status: "error",
              message: toUserMessage(
                error,
                "We couldn't run that search. Please try again.",
              ),
            });
          }
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, service]);

  return state;
}
