import type {
  SearchEntityType,
  SearchQuery,
} from "@/domain/entities/search";

/**
 * A single search result, normalized across every entity type so the
 * presentation layer can render and navigate uniformly. Built by the
 * infrastructure readers (which know the joined parent ids) via the pure
 * application hit builders.
 */
export interface SearchHit {
  /** Which kind of entity this is. */
  type: SearchEntityType;
  /** The entity's id. */
  id: string;
  /** Primary line shown to the researcher. */
  title: string;
  /** Optional secondary context line (parent, date, category, …). */
  subtitle?: string;
  /** In-app route to navigate to this entity. */
  route: string;
}

/** Search hits of one entity type, grouped for display. */
export interface SearchResultGroup {
  type: SearchEntityType;
  /** Plural, researcher-facing label for the group header. */
  label: string;
  hits: SearchHit[];
}

/** The full result of a search: groups (non-empty, in display order) + total. */
export interface SearchResults {
  groups: SearchResultGroup[];
  total: number;
}

/**
 * Narrow read-only search ports — one per searchable entity (Interface
 * Segregation). Each is implemented by that entity's existing SQLite repository,
 * which pushes the text query and its own applicable filters down to SQL (so the
 * whole table is never loaded into memory). The {@link SearchService} composes
 * these readers; a new searchable entity adds a reader here and registers it with
 * the service — no redesign.
 *
 * A reader is only ever called when its entity type is eligible for the query, so
 * it applies the filters relevant to it and ignores the rest.
 */
export interface StudySearchReader {
  searchStudies(query: SearchQuery): Promise<SearchHit[]>;
}
export interface AnimalSearchReader {
  searchAnimals(query: SearchQuery): Promise<SearchHit[]>;
}
export interface ProtocolTemplateSearchReader {
  searchProtocolTemplates(query: SearchQuery): Promise<SearchHit[]>;
}
export interface TimelineEventSearchReader {
  searchTimelineEvents(query: SearchQuery): Promise<SearchHit[]>;
}
export interface MriSessionSearchReader {
  searchMriSessions(query: SearchQuery): Promise<SearchHit[]>;
}
export interface ObservationSearchReader {
  searchObservations(query: SearchQuery): Promise<SearchHit[]>;
}
export interface ResearchAssetSearchReader {
  searchResearchAssets(query: SearchQuery): Promise<SearchHit[]>;
}
