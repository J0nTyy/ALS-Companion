import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import { studiesService } from "@/composition/studies";
import { animalsService } from "@/composition/animals";
import { observationsService } from "@/composition/observations";
import { timelineEventsService } from "@/composition/timeline-events";
import { protocolTemplatesService } from "@/composition/protocol-templates";
import { mriSessionsService } from "@/composition/mri-sessions";
import { researchAssetsService } from "@/composition/research-assets";
import { searchService } from "@/composition/search";
import { storageService } from "@/composition/storage";
import { mriComparisonService } from "@/composition/mri-comparison";
import { dashboardService } from "@/composition/dashboard";
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
      researchAssetsService={researchAssetsService}
      searchService={searchService}
      storageService={storageService}
      mriComparisonService={mriComparisonService}
      dashboardService={dashboardService}
    />
  </React.StrictMode>,
);
