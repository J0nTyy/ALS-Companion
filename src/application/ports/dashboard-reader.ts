/**
 * Read model for the Research Dashboard (v1.2). A pure read over EXISTING tables —
 * NO new entity or table, NO new persistence. It supplies the cross-entity
 * aggregates the dashboard needs that no scoped repository provides (recent items
 * across all animals, workspace-wide counts, planned/completed timeline events).
 *
 * Each summary carries just enough context (parent study/animal) to display a row
 * and link to the right screen — it never fabricates data.
 */

export interface DashboardCounts {
  animals: number;
  observations: number;
  mriSessions: number;
  researchAssets: number;
  timelinePlanned: number;
  timelineCompleted: number;
}

export interface AnimalSummary {
  id: string;
  studyId: string;
  studyName: string;
  animalIdentifier: string;
  updatedAt: string;
}

export interface TimelineEventSummary {
  id: string;
  animalId: string;
  studyId: string;
  animalIdentifier: string;
  title: string;
  category: string;
  status: string;
  plannedDate?: string;
  completedDate?: string;
  updatedAt: string;
}

export interface ObservationSummary {
  id: string;
  animalId: string;
  studyId: string;
  animalIdentifier: string;
  kind: string;
  observedOn: string;
  updatedAt: string;
}

export interface MriSessionSummary {
  id: string;
  animalId: string;
  studyId: string;
  animalIdentifier: string;
  title: string;
  acquisitionDate: string;
  updatedAt: string;
}

export interface ResearchAssetSummary {
  id: string;
  animalId: string;
  studyId: string;
  animalIdentifier: string;
  title: string;
  assetType: string;
  status: string;
  updatedAt: string;
}

/**
 * A single read of everything the dashboard aggregates (studies come separately
 * from the existing StudiesService). Lists are already bounded and ordered by the
 * reader; the service layer does the pure shaping (current study, due-work
 * bucketing, recent-activity merge, quick actions).
 */
export interface DashboardSnapshot {
  counts: DashboardCounts;
  recentAnimals: AnimalSummary[];
  recentObservations: ObservationSummary[];
  recentMriSessions: MriSessionSummary[];
  recentResearchAssets: ResearchAssetSummary[];
  /** Planned events that have a planned date, ordered by planned date ascending. */
  plannedEvents: TimelineEventSummary[];
  /** Completed events that have a completed date, most recently completed first. */
  recentCompletedEvents: TimelineEventSummary[];
}

/** Port: one read producing the dashboard snapshot. Implemented in infrastructure. */
export interface DashboardReader {
  load(): Promise<DashboardSnapshot>;
}
