import type { CalendarDate } from "@/application/ports/calendar";
import type { DashboardReader } from "@/application/ports/dashboard-reader";
import type { StudiesService } from "@/application/services/studies-service";
import type { DashboardViewModel } from "@/application/use-cases/dashboard/dashboard-view";
import {
  countStudies,
  pickCurrentStudy,
} from "@/application/use-cases/dashboard/current-study";
import { computeDueWork } from "@/application/use-cases/dashboard/due-work";
import {
  buildRecentActivity,
  groupActivityByDay,
} from "@/application/use-cases/dashboard/recent-activity";
import { resolveQuickActions } from "@/application/use-cases/dashboard/quick-actions";

const RECENT_STUDIES = 5;
const UPCOMING_EVENTS = 6;
const RECENTLY_COMPLETED_DISPLAY = 5;

/**
 * The application's **orchestration layer** for the home dashboard. It composes
 * existing collaborators — the existing `StudiesService`, a cross-entity
 * `DashboardReader` (a read over existing tables; no new persistence), and the
 * `CalendarDate` — and applies pure shaping (current study, due-work bucketing,
 * recent-activity merge, quick actions). It duplicates NO business logic and
 * fabricates NO data: an empty workspace yields an empty (but valid) view model.
 */
export interface DashboardService {
  load(): Promise<DashboardViewModel>;
}

export function createDashboardService(deps: {
  studies: StudiesService;
  reader: DashboardReader;
  calendar: CalendarDate;
}): DashboardService {
  return {
    async load(): Promise<DashboardViewModel> {
      const [studies, snapshot] = await Promise.all([
        deps.studies.list({ includeArchived: true }),
        deps.reader.load(),
      ]);

      const today = deps.calendar.today();
      const studyCounts = countStudies(studies);
      const currentStudy = pickCurrentStudy(studies);

      const upcomingEvents = snapshot.plannedEvents
        .filter((e) => e.plannedDate !== undefined && e.plannedDate >= today)
        .slice(0, UPCOMING_EVENTS);

      const dueWork = computeDueWork(
        snapshot.plannedEvents,
        snapshot.recentCompletedEvents,
        today,
      );

      const recentActivity = groupActivityByDay(
        buildRecentActivity({ studies, snapshot }),
        today,
      );

      return {
        currentStudy,
        recentStudies: studies.slice(0, RECENT_STUDIES),
        counts: {
          studiesTotal: studyCounts.total,
          studiesActive: studyCounts.active,
          studiesArchived: studyCounts.archived,
          animals: snapshot.counts.animals,
          observations: snapshot.counts.observations,
          mriSessions: snapshot.counts.mriSessions,
          researchAssets: snapshot.counts.researchAssets,
          timelinePlanned: snapshot.counts.timelinePlanned,
          timelineCompleted: snapshot.counts.timelineCompleted,
        },
        recentAnimals: snapshot.recentAnimals,
        upcomingEvents,
        recentlyCompletedEvents: snapshot.recentCompletedEvents.slice(
          0,
          RECENTLY_COMPLETED_DISPLAY,
        ),
        recentObservations: snapshot.recentObservations,
        recentMriSessions: snapshot.recentMriSessions,
        recentResearchAssets: snapshot.recentResearchAssets,
        dueWork,
        recentActivity,
        quickActions: resolveQuickActions(currentStudy?.id ?? null),
      };
    },
  };
}
