import {
  SEARCH_ENTITY_TYPE_META,
  type SearchEntityType,
  type SearchQuery,
} from "@/domain/entities/search";
import type {
  SearchHit,
  SearchResultGroup,
  SearchResults,
} from "@/application/ports/search";
import type { SearchUseCaseDeps } from "@/application/use-cases/deps";
import { eligibleTypes } from "@/application/use-cases/search/resolve-search-scope";

/**
 * Facade the presentation layer depends on for global search. It is the
 * application's primary **navigation layer**: it coordinates the per-entity
 * search readers, but owns no SQL and no per-entity mapping itself.
 *
 * A future searchable module registers by adding a reader to
 * {@link SearchUseCaseDeps} and a branch in the dispatch table below — the rest of
 * the app is untouched (see PROJECT_MEMORY.md D36).
 */
export interface SearchService {
  search(query: SearchQuery): Promise<SearchResults>;
}

/**
 * Bind the per-entity search readers into a service.
 *
 * Orchestration: normalize the query, ask {@link eligibleTypes} which entity
 * types can match (so only relevant repositories are touched), fan out to those
 * readers in parallel, then group the hits by type in canonical display order,
 * dropping empty groups.
 */
export function createSearchService(deps: SearchUseCaseDeps): SearchService {
  const dispatch: Record<
    SearchEntityType,
    (query: SearchQuery) => Promise<SearchHit[]>
  > = {
    study: (q) => deps.studies.searchStudies(q),
    animal: (q) => deps.animals.searchAnimals(q),
    protocol_template: (q) => deps.protocols.searchProtocolTemplates(q),
    timeline_event: (q) => deps.timelineEvents.searchTimelineEvents(q),
    mri_session: (q) => deps.mriSessions.searchMriSessions(q),
    observation: (q) => deps.observations.searchObservations(q),
    research_asset: (q) => deps.researchAssets.searchResearchAssets(q),
  };

  return {
    async search(query: SearchQuery): Promise<SearchResults> {
      const normalized: SearchQuery = {
        ...query,
        text: query.text.trim(),
      };

      const types = eligibleTypes(normalized);
      if (types.length === 0) {
        return { groups: [], total: 0 };
      }

      const results = await Promise.all(
        types.map((type) => dispatch[type](normalized)),
      );

      const groups: SearchResultGroup[] = [];
      let total = 0;
      types.forEach((type, index) => {
        const hits = results[index] ?? [];
        if (hits.length > 0) {
          groups.push({
            type,
            label: SEARCH_ENTITY_TYPE_META[type].pluralLabel,
            hits,
          });
          total += hits.length;
        }
      });

      return { groups, total };
    },
  };
}
