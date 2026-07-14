/**
 * Composition root for the Analytics Workspace (v2.1). Reuses the already-built
 * application services — analytics is a read-only aggregation layer over them, with
 * no new persistence or data path.
 */
import {
  createAnalyticsService,
  type AnalyticsService,
} from "@/application/services/analytics-service";
import { studiesService } from "@/composition/studies";
import { animalsService } from "@/composition/animals";
import { publicationWorkspaceService } from "@/composition/publication";

export const analyticsService: AnalyticsService = createAnalyticsService({
  studies: studiesService,
  animals: animalsService,
  publication: publicationWorkspaceService,
});
