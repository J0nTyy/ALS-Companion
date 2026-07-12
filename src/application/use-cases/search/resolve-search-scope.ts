import {
  SEARCH_ENTITY_TYPES,
  type SearchEntityType,
  type SearchFilters,
  type SearchQuery,
} from "@/domain/entities/search";

/**
 * Pure logic that decides, for a given query, which entity types could possibly
 * match — the heart of "filtering combinations". Each active filter constrains
 * the eligible set to the entity types it can apply to; the sets are intersected
 * (with each other and with any requested `types` scope). Contradictory filters
 * (e.g. an MRI modality AND an observation type) intersect to nothing, so no
 * reader is queried.
 *
 * Keeping this here (not in the readers) means the {@link SearchService} only
 * touches repositories that can contribute, which is both correct and efficient.
 */

/** Entity types that belong to an animal (reachable by an `animalId` filter). */
const ANIMAL_SCOPED: readonly SearchEntityType[] = [
  "animal",
  "observation",
  "timeline_event",
  "mri_session",
  "research_asset",
];

/** Entity types that carry a date usable for a date-range filter. */
const DATE_SCOPED: readonly SearchEntityType[] = [
  "observation",
  "timeline_event",
  "mri_session",
];

/** Entity types that carry a lifecycle status. */
const STATUS_SCOPED: readonly SearchEntityType[] = [
  "study",
  "timeline_event",
  "research_asset",
];

function nonEmpty(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

/** Whether any structured filter is set. */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    nonEmpty(filters.studyId) ||
    nonEmpty(filters.animalId) ||
    nonEmpty(filters.mutation) ||
    nonEmpty(filters.treatmentGroup) ||
    nonEmpty(filters.timelineCategory) ||
    nonEmpty(filters.observationType) ||
    nonEmpty(filters.mriModality) ||
    nonEmpty(filters.researchAssetType) ||
    nonEmpty(filters.status) ||
    nonEmpty(filters.dateFrom) ||
    nonEmpty(filters.dateTo)
  );
}

/**
 * A query is actionable when it has free text OR at least one filter. An empty
 * query (no text, no filters) must NOT dump every table — it returns nothing and
 * the UI shows a prompt/empty state. A bare `types` scope is not, by itself,
 * actionable.
 */
export function isActionableQuery(query: SearchQuery): boolean {
  return query.text.trim().length > 0 || hasActiveFilters(query.filters);
}

function intersect(
  set: Set<SearchEntityType>,
  allowed: readonly SearchEntityType[],
): Set<SearchEntityType> {
  return new Set(allowed.filter((t) => set.has(t)));
}

/**
 * The entity types eligible to match `query`, in canonical display order. Empty
 * when the query is not actionable or the filters are mutually exclusive.
 */
export function eligibleTypes(query: SearchQuery): SearchEntityType[] {
  if (!isActionableQuery(query)) return [];

  const scope = query.types && query.types.length > 0 ? query.types : SEARCH_ENTITY_TYPES;
  let set = new Set<SearchEntityType>(scope);

  const f = query.filters;
  // studyId does not constrain the type: every entity belongs to a study.
  if (nonEmpty(f.animalId)) set = intersect(set, ANIMAL_SCOPED);
  if (nonEmpty(f.mutation)) set = intersect(set, ["animal"]);
  if (nonEmpty(f.treatmentGroup)) set = intersect(set, ["animal"]);
  if (nonEmpty(f.timelineCategory)) set = intersect(set, ["timeline_event"]);
  if (nonEmpty(f.observationType)) set = intersect(set, ["observation"]);
  if (nonEmpty(f.mriModality)) set = intersect(set, ["mri_session"]);
  if (nonEmpty(f.researchAssetType)) set = intersect(set, ["research_asset"]);
  if (nonEmpty(f.status)) set = intersect(set, STATUS_SCOPED);
  if (nonEmpty(f.dateFrom) || nonEmpty(f.dateTo)) set = intersect(set, DATE_SCOPED);

  // Return in canonical order for stable, predictable grouping.
  return SEARCH_ENTITY_TYPES.filter((t) => set.has(t));
}
