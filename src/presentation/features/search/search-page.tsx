import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

import type {
  SearchFilters,
  SearchQuery,
} from "@/domain/entities/search";
import { Input } from "@/presentation/components/ui/input";
import { SearchFilterBar } from "./components/search-filter-bar";
import { EMPTY_SEARCH_FORM, type SearchFormValues } from "./search-form";
import { SearchResultList } from "./components/search-result-list";
import { useSearch } from "./use-search";

/**
 * The global Search page — the application's primary navigation surface. A
 * researcher can find any study, animal, protocol, timeline event, MRI session,
 * observation, or research asset from one place and jump straight to it. Text and
 * filters combine; the query is debounced and runs through the SearchService.
 */
export function SearchPage() {
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";

  const [text, setText] = useState(urlQuery);
  const [form, setForm] = useState<SearchFormValues>(EMPTY_SEARCH_FORM);

  // Re-seed the text when the shell's search box deep-links a new query.
  useEffect(() => {
    setText(urlQuery);
  }, [urlQuery]);

  const query: SearchQuery = useMemo(() => {
    const filters: SearchFilters = {
      ...(form.mutation.trim() ? { mutation: form.mutation.trim() } : {}),
      ...(form.treatmentGroup.trim()
        ? { treatmentGroup: form.treatmentGroup.trim() }
        : {}),
      ...(form.timelineCategory
        ? { timelineCategory: form.timelineCategory }
        : {}),
      ...(form.observationType
        ? { observationType: form.observationType }
        : {}),
      ...(form.mriModality ? { mriModality: form.mriModality } : {}),
      ...(form.researchAssetType
        ? { researchAssetType: form.researchAssetType }
        : {}),
      ...(form.status ? { status: form.status } : {}),
      ...(form.dateFrom ? { dateFrom: form.dateFrom } : {}),
      ...(form.dateTo ? { dateTo: form.dateTo } : {}),
    };
    return {
      text,
      filters,
      ...(form.typeScope !== "all" ? { types: [form.typeScope] } : {}),
    };
  }, [text, form]);

  const state = useSearch(query);

  const formIsActive =
    JSON.stringify(form) !== JSON.stringify(EMPTY_SEARCH_FORM);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find anything across your studies — no folder-hunting required.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search studies, animals, MRI sessions, files…"
            aria-label="Search"
            autoFocus
            className="h-12 pl-10 text-base"
          />
        </div>
      </form>

      <SearchFilterBar
        values={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClear={() => setForm(EMPTY_SEARCH_FORM)}
        hasActiveFilters={formIsActive}
      />

      <div className="min-h-24">
        {state.status === "unavailable" ? (
          <Message>Search is available in the installed desktop app.</Message>
        ) : null}

        {state.status === "idle" ? (
          <Message>
            Search across studies, animals, timeline events, MRI sessions,
            observations, and research assets. Type above or choose a filter to
            begin.
          </Message>
        ) : null}

        {state.status === "loading" ? <Message>Searching…</Message> : null}

        {state.status === "error" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}

        {state.status === "ready" ? (
          state.results.total === 0 ? (
            <Message>
              No matches. Try different words, or clear a filter.
            </Message>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {state.results.total}{" "}
                {state.results.total === 1 ? "result" : "results"}
              </p>
              <SearchResultList groups={state.results.groups} />
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
