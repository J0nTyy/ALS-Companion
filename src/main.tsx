import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { studiesService } from "@/composition/studies";
import { animalsService } from "@/composition/animals";
import { observationsService } from "@/composition/observations";
import { timelineEventsService } from "@/composition/timeline-events";
import { protocolTemplatesService } from "@/composition/protocol-templates";
import { mriSessionsService } from "@/composition/mri-sessions";
import { histologySessionsService } from "@/composition/histology-sessions";
import { biomarkerService } from "@/composition/biomarkers";
import { researchAssetsService } from "@/composition/research-assets";
import { searchService } from "@/composition/search";
import { storageService } from "@/composition/storage";
import { mriComparisonService } from "@/composition/mri-comparison";
import { dashboardService } from "@/composition/dashboard";
import { publicationWorkspaceService } from "@/composition/publication";
import { deletionService } from "@/composition/deletion";
import { annotationsService } from "@/composition/annotations";
import { annotationLinkService } from "@/composition/annotation-links";
import { exportService } from "@/composition/export";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root was not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App
      studiesService={studiesService}
      animalsService={animalsService}
      observationsService={observationsService}
      timelineEventsService={timelineEventsService}
      protocolTemplatesService={protocolTemplatesService}
      mriSessionsService={mriSessionsService}
      histologySessionsService={histologySessionsService}
      biomarkerService={biomarkerService}
      researchAssetsService={researchAssetsService}
      searchService={searchService}
      storageService={storageService}
      mriComparisonService={mriComparisonService}
      dashboardService={dashboardService}
      publicationWorkspaceService={publicationWorkspaceService}
      deletionService={deletionService}
      annotationService={annotationsService}
      annotationLinkService={annotationLinkService}
      exportService={exportService}
    />
  </React.StrictMode>,
);
