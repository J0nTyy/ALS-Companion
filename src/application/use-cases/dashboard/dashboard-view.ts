import type { Study } from "@/domain/entities/study";
import type {
  AnimalSummary,
  MriSessionSummary,
  ObservationSummary,
  ResearchAssetSummary,
  TimelineEventSummary,
} from "@/application/ports/dashboard-reader";

/** Studies-wide counts, real numbers over existing data (never fabricated). */
export interface DashboardCountsView {
  studiesTotal: number;
  studiesActive: number;
  studiesArchived: number;
  animals: number;
  observations: number;
  mriSessions: number;
  researchAssets: number;
  timelinePlanned: number;
  timelineCompleted: number;
}

/** "Today's Work" buckets, derived only from existing planned/completed dates. */
export interface DueWork {
  today: TimelineEventSummary[];
  overdue: TimelineEventSummary[];
  recentlyCompleted: TimelineEventSummary[];
}

export type DashboardActivityType =
  | "study"
  | "animal"
  | "timeline_event"
  | "observation"
  | "mri_session"
  | "research_asset";

/** One entry in the merged recent-activity feed. */
export interface ActivityItem {
  type: DashboardActivityType;
  id: string;
  title: string;
  subtitle?: string;
  route: string;
  /** ISO-8601 timestamp the ordering/grouping is based on. */
  timestamp: string;
}

/** Recent-activity items grouped by day (Today / Yesterday / date). */
export interface ActivityGroup {
  /** The `YYYY-MM-DD` day key. */
  key: string;
  label: string;
  items: ActivityItem[];
}

export interface QuickAction {
  id: string;
  label: string;
  to: string;
}

/** The fully-shaped view model the dashboard presentation renders. */
export interface DashboardViewModel {
  currentStudy: Study | null;
  recentStudies: Study[];
  counts: DashboardCountsView;
  recentAnimals: AnimalSummary[];
  upcomingEvents: TimelineEventSummary[];
  recentlyCompletedEvents: TimelineEventSummary[];
  recentObservations: ObservationSummary[];
  recentMriSessions: MriSessionSummary[];
  recentResearchAssets: ResearchAssetSummary[];
  dueWork: DueWork;
  recentActivity: ActivityGroup[];
  quickActions: QuickAction[];
}

/** In-app route to a study's detail page. */
export function studyRoute(studyId: string): string {
  return `/studies/${studyId}`;
}

/** In-app route to an animal's detail page (where observations/timeline/MRI live). */
export function animalRoute(studyId: string, animalId: string): string {
  return `/studies/${studyId}/animals/${animalId}`;
}
