import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import type { StudiesService } from "@/application/services/studies-service";
import type { AnimalsService } from "@/application/services/animals-service";
import type { ObservationsService } from "@/application/services/observations-service";
import type { TimelineEventsService } from "@/application/services/timeline-events-service";
import type { ProtocolTemplateService } from "@/application/services/protocol-template-service";
import type { MriSessionService } from "@/application/services/mri-session-service";
import type { HistologySessionService } from "@/application/services/histology-session-service";
import type { BiomarkerService } from "@/application/services/biomarker-service";
import type { ResearchAssetService } from "@/application/services/research-asset-service";
import type { SearchService } from "@/application/services/search-service";
import type { StorageService } from "@/application/services/storage-service";
import type { MriComparisonService } from "@/application/services/mri-comparison-service";
import type { DashboardService } from "@/application/services/dashboard-service";
import type { PublicationWorkspaceService } from "@/application/services/publication-workspace-service";
import type { DeletionService } from "@/application/services/deletion-service";
import type { AnnotationService } from "@/application/services/annotation-service";
import type { AnnotationLinkService } from "@/application/services/annotation-link-service";
import type { ExportService } from "@/application/services/export-service";
import type { AnalyticsService } from "@/application/services/analytics-service";
import { ThemeProvider } from "@/shared/hooks/use-theme";
import { SettingsProvider } from "@/shared/hooks/use-settings";
import { AppShell } from "@/presentation/layouts/app-shell";
import { DashboardServiceProvider } from "@/presentation/features/dashboard/dashboard-service-context";
import { PublicationServiceProvider } from "@/presentation/features/publication/publication-service-context";
import { ExportServiceProvider } from "@/presentation/features/publication/export-service-context";
import { DeletionServiceProvider } from "@/presentation/features/deletion/deletion-service-context";
import { AnnotationServiceProvider } from "@/presentation/features/annotations/annotation-service-context";
import { AnnotationLinkServiceProvider } from "@/presentation/features/annotation-links/annotation-link-service-context";
import { ContextMenuProvider } from "@/presentation/features/context-menu/context-menu-context";
import { ToastProvider } from "@/presentation/features/toast/toast-context";
import { UpdaterProvider } from "@/presentation/features/updater/updater-context";
import { AnalyticsServiceProvider } from "@/presentation/features/analytics/analytics-service-context";
import { StudiesServiceProvider } from "@/presentation/features/studies/studies-service-context";
import { AnimalsServiceProvider } from "@/presentation/features/animals/animals-service-context";
import { ObservationsServiceProvider } from "@/presentation/features/observations/observations-service-context";
import { TimelineEventsServiceProvider } from "@/presentation/features/timeline/timeline-events-service-context";
import { ProtocolServiceProvider } from "@/presentation/features/protocols/protocol-service-context";
import { MriSessionServiceProvider } from "@/presentation/features/mri/mri-session-service-context";
import { HistologySessionServiceProvider } from "@/presentation/features/histology/histology-session-service-context";
import { BiomarkerServiceProvider } from "@/presentation/features/biomarkers/biomarker-service-context";
import { ResearchAssetServiceProvider } from "@/presentation/features/assets/research-asset-service-context";
import { SearchServiceProvider } from "@/presentation/features/search/search-service-context";
import { StorageServiceProvider } from "@/presentation/features/storage/storage-service-context";
import { MriComparisonServiceProvider } from "@/presentation/features/mri-comparison/mri-comparison-service-context";

/*
 * Route pages are lazy-loaded (React.lazy) so each screen ships as its own chunk
 * behind the AppShell's Suspense boundary — the initial bundle only pays for the
 * shell + providers, not every heavy workspace (comparison, publication, viewer).
 */
const DashboardPage = lazy(() =>
  import("@/presentation/features/dashboard/dashboard-page").then((m) => ({
    default: m.DashboardPage,
  })),
);
const StudiesPage = lazy(() =>
  import("@/presentation/features/studies/studies-page").then((m) => ({
    default: m.StudiesPage,
  })),
);
const StudyCreatePage = lazy(() =>
  import("@/presentation/features/studies/study-create-page").then((m) => ({
    default: m.StudyCreatePage,
  })),
);
const StudyDetailPage = lazy(() =>
  import("@/presentation/features/studies/study-detail-page").then((m) => ({
    default: m.StudyDetailPage,
  })),
);
const AnimalDetailPage = lazy(() =>
  import("@/presentation/features/animals/animal-detail-page").then((m) => ({
    default: m.AnimalDetailPage,
  })),
);
const SearchPage = lazy(() =>
  import("@/presentation/features/search/search-page").then((m) => ({
    default: m.SearchPage,
  })),
);
const MriComparisonPage = lazy(() =>
  import("@/presentation/features/mri-comparison/mri-comparison-page").then(
    (m) => ({ default: m.MriComparisonPage }),
  ),
);
const PublicationPage = lazy(() =>
  import("@/presentation/features/publication/publication-page").then((m) => ({
    default: m.PublicationPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import("@/presentation/features/analytics/analytics-page").then((m) => ({
    default: m.AnalyticsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/presentation/features/settings/settings-page").then((m) => ({
    default: m.SettingsPage,
  })),
);
const HelpPage = lazy(() =>
  import("@/presentation/features/help/help-page").then((m) => ({
    default: m.HelpPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/presentation/features/not-found/not-found-page").then((m) => ({
    default: m.NotFoundPage,
  })),
);

/**
 * Application root. Providers wrap the router, which nests every screen inside
 * the shared app shell. Services are injected here (built in the composition
 * root) so screens depend on the service interfaces, not on SQLite.
 */
export function App({
  studiesService,
  animalsService,
  observationsService,
  timelineEventsService,
  protocolTemplatesService,
  mriSessionsService,
  histologySessionsService,
  biomarkerService,
  researchAssetsService,
  searchService,
  storageService,
  mriComparisonService,
  dashboardService,
  publicationWorkspaceService,
  deletionService,
  annotationService,
  annotationLinkService,
  exportService,
  analyticsService,
}: {
  studiesService: StudiesService;
  animalsService: AnimalsService;
  observationsService: ObservationsService;
  timelineEventsService: TimelineEventsService;
  protocolTemplatesService: ProtocolTemplateService;
  mriSessionsService: MriSessionService;
  histologySessionsService: HistologySessionService;
  biomarkerService: BiomarkerService;
  researchAssetsService: ResearchAssetService;
  searchService: SearchService;
  storageService: StorageService;
  mriComparisonService: MriComparisonService;
  dashboardService: DashboardService;
  publicationWorkspaceService: PublicationWorkspaceService;
  deletionService: DeletionService;
  annotationService: AnnotationService;
  annotationLinkService: AnnotationLinkService;
  exportService: ExportService;
  analyticsService: AnalyticsService;
}) {
  return (
    <ThemeProvider>
      <SettingsProvider>
      <ToastProvider>
      <UpdaterProvider>
      <AnalyticsServiceProvider service={analyticsService}>
      <ContextMenuProvider>
      <StudiesServiceProvider service={studiesService}>
        <AnimalsServiceProvider service={animalsService}>
          <ObservationsServiceProvider service={observationsService}>
            <TimelineEventsServiceProvider service={timelineEventsService}>
              <ProtocolServiceProvider service={protocolTemplatesService}>
                <MriSessionServiceProvider service={mriSessionsService}>
                  <HistologySessionServiceProvider service={histologySessionsService}>
                  <BiomarkerServiceProvider service={biomarkerService}>
                  <ResearchAssetServiceProvider service={researchAssetsService}>
                  <SearchServiceProvider service={searchService}>
                  <StorageServiceProvider service={storageService}>
                  <MriComparisonServiceProvider service={mriComparisonService}>
                  <DashboardServiceProvider service={dashboardService}>
                  <PublicationServiceProvider service={publicationWorkspaceService}>
                  <ExportServiceProvider service={exportService}>
                  <DeletionServiceProvider service={deletionService}>
                  <AnnotationServiceProvider service={annotationService}>
                  <AnnotationLinkServiceProvider service={annotationLinkService}>
                  <BrowserRouter>
                  <Routes>
                    <Route element={<AppShell />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="studies" element={<StudiesPage />} />
                      <Route path="studies/new" element={<StudyCreatePage />} />
                      <Route path="studies/:id" element={<StudyDetailPage />} />
                      <Route
                        path="studies/:studyId/animals/:animalId"
                        element={<AnimalDetailPage />}
                      />
                      <Route path="search" element={<SearchPage />} />
                      <Route path="compare" element={<MriComparisonPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="publish" element={<PublicationPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="help" element={<HelpPage />} />
                      <Route path="404" element={<NotFoundPage />} />
                      <Route
                        path="*"
                        element={<Navigate to="/404" replace />}
                      />
                    </Route>
                  </Routes>
                  </BrowserRouter>
                  </AnnotationLinkServiceProvider>
                  </AnnotationServiceProvider>
                  </DeletionServiceProvider>
                  </ExportServiceProvider>
                  </PublicationServiceProvider>
                  </DashboardServiceProvider>
                  </MriComparisonServiceProvider>
                  </StorageServiceProvider>
                  </SearchServiceProvider>
                  </ResearchAssetServiceProvider>
                  </BiomarkerServiceProvider>
                  </HistologySessionServiceProvider>
                </MriSessionServiceProvider>
              </ProtocolServiceProvider>
            </TimelineEventsServiceProvider>
          </ObservationsServiceProvider>
        </AnimalsServiceProvider>
      </StudiesServiceProvider>
      </ContextMenuProvider>
      </AnalyticsServiceProvider>
      </UpdaterProvider>
      </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
