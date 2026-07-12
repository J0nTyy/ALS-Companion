/**
 * Domain vocabulary: Search
 * ----------------------------------------------------------------------------
 * The shared, framework-free vocabulary for the application's global search /
 * navigation layer: which kinds of entity are searchable, the structured filters
 * a search may carry, and the query shape. No React, SQLite, or Tauri.
 *
 * This is deliberately a lightweight, exact-match/substring search foundation —
 * NOT fuzzy ranking, semantic search, embeddings, or AI. Its purpose is a
 * scalable architecture every future module can register with (see
 * PROJECT_MEMORY.md D36): a new searchable entity is added by extending
 * `SEARCH_ENTITY_TYPES` and providing a reader, with no redesign.
 */

import type { TimelineEventCategory } from "./timeline-event";
import type { ObservationKind } from "./observation";
import type { MriModality } from "./mri-session";
import type { ResearchAssetType } from "./research-asset";

/**
 * Every entity type the global search can return, in the order results are
 * grouped for display. Extensible: adding a type is a one-line change here plus a
 * reader — everything else keys off this union.
 */
export const SEARCH_ENTITY_TYPES = [
  "study",
  "animal",
  "protocol_template",
  "timeline_event",
  "mri_session",
  "observation",
  "research_asset",
] as const;

export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

/**
 * Structured filters a search may combine with (or instead of) free text. Every
 * field is optional; an absent field imposes no constraint. Designed so future
 * filters slot in without redesign.
 */
export interface SearchFilters {
  /** Restrict to entities belonging to this study. */
  studyId?: string;
  /** Restrict to entities belonging to this animal. */
  animalId?: string;
  /** Substring match on an animal's mutation / genotype. */
  mutation?: string;
  /** Substring match on an animal's treatment group. */
  treatmentGroup?: string;
  /** Exact timeline-event category. */
  timelineCategory?: TimelineEventCategory;
  /** Exact observation kind. */
  observationType?: ObservationKind;
  /** Exact MRI modality. */
  mriModality?: MriModality;
  /** Exact research-asset type. */
  researchAssetType?: ResearchAssetType;
  /**
   * Exact lifecycle status. Cross-entity: a value naturally selects whichever
   * status-bearing entities use it (study / timeline event / research asset).
   */
  status?: string;
  /** Inclusive lower bound (local `YYYY-MM-DD`) for date-bearing entities. */
  dateFrom?: string;
  /** Inclusive upper bound (local `YYYY-MM-DD`) for date-bearing entities. */
  dateTo?: string;
}

/** A complete search request. */
export interface SearchQuery {
  /** Free-text query; matched as a case-insensitive substring. */
  text: string;
  /** Structured filters (all optional). */
  filters: SearchFilters;
  /**
   * Optional scope: restrict results to these entity types. Empty/undefined
   * means "all types".
   */
  types?: SearchEntityType[];
}

/** User-facing labels for each searchable entity type. */
export const SEARCH_ENTITY_TYPE_META: Record<
  SearchEntityType,
  { label: string; pluralLabel: string }
> = {
  study: { label: "Study", pluralLabel: "Studies" },
  animal: { label: "Animal", pluralLabel: "Animals" },
  protocol_template: { label: "Protocol", pluralLabel: "Protocols" },
  timeline_event: { label: "Timeline event", pluralLabel: "Timeline events" },
  mri_session: { label: "MRI session", pluralLabel: "MRI sessions" },
  observation: { label: "Observation", pluralLabel: "Observations" },
  research_asset: { label: "Research asset", pluralLabel: "Research assets" },
};

export function isSearchEntityType(value: unknown): value is SearchEntityType {
  return (
    typeof value === "string" &&
    (SEARCH_ENTITY_TYPES as readonly string[]).includes(value)
  );
}
