import type { Study } from "@/domain/entities/study";
import type { Animal } from "@/domain/entities/animal";
import type { StudiesService } from "@/application/services/studies-service";
import type { AnimalsService } from "@/application/services/animals-service";
import type { PublicationWorkspaceService } from "@/application/services/publication-workspace-service";
import {
  computeOverview,
  computeStudyAnalytics,
  studyFilterOptions,
  type AnalyticsFilters,
  type OverviewAnalytics,
  type StudyAnalytics,
} from "@/application/analytics/analytics";

/**
 * Read-only cohort analytics (v2.1). It COMPOSES existing services to gather data
 * (never bypasses them, never duplicates business logic) and defers all arithmetic
 * to the pure functions in `@/application/analytics/analytics`. Nothing is persisted.
 */
export interface StudyAnalyticsResult {
  analytics: StudyAnalytics;
  options: { treatmentGroups: string[]; mutations: string[] };
}

export interface AnalyticsService {
  listStudies(): Promise<Study[]>;
  overview(): Promise<OverviewAnalytics>;
  forStudy(studyId: string, filters?: AnalyticsFilters): Promise<StudyAnalyticsResult>;
}

export interface AnalyticsDeps {
  studies: StudiesService;
  animals: AnimalsService;
  publication: PublicationWorkspaceService;
}

export function createAnalyticsService(deps: AnalyticsDeps): AnalyticsService {
  return {
    listStudies: () => deps.studies.list({ includeArchived: true }),

    async overview(): Promise<OverviewAnalytics> {
      const studies = await deps.studies.list({ includeArchived: true });
      const animalLists = await Promise.all(
        studies.map((s) => deps.animals.listByStudy(s.id)),
      );
      const animals: Animal[] = animalLists.flat();
      return computeOverview(studies, animals);
    },

    async forStudy(
      studyId: string,
      filters: AnalyticsFilters = {},
    ): Promise<StudyAnalyticsResult> {
      const contents = await deps.publication.loadStudy(studyId);
      return {
        analytics: computeStudyAnalytics(contents, filters),
        options: studyFilterOptions(contents),
      };
    },
  };
}
