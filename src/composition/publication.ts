/**
 * Composition root for the Publication Workspace (v1.3).
 * ----------------------------------------------------------------------------
 * Reuses the already-built application services (no new persistence, no new data
 * path). The workspace is an aggregation layer that loads one study's contents by
 * composing these services; package assembly/preview/validation are pure.
 */
import {
  createPublicationWorkspaceService,
  type PublicationWorkspaceService,
} from "@/application/services/publication-workspace-service";
import { studiesService } from "@/composition/studies";
import { animalsService } from "@/composition/animals";
import { observationsService } from "@/composition/observations";
import { timelineEventsService } from "@/composition/timeline-events";
import { protocolTemplatesService } from "@/composition/protocol-templates";
import { mriSessionsService } from "@/composition/mri-sessions";
import { researchAssetsService } from "@/composition/research-assets";
import { storageService } from "@/composition/storage";
import { annotationsService } from "@/composition/annotations";
import { annotationLinkService } from "@/composition/annotation-links";

export const publicationWorkspaceService: PublicationWorkspaceService =
  createPublicationWorkspaceService({
    studies: studiesService,
    animals: animalsService,
    observations: observationsService,
    timelineEvents: timelineEventsService,
    protocols: protocolTemplatesService,
    mriSessions: mriSessionsService,
    researchAssets: researchAssetsService,
    storage: storageService,
    annotations: annotationsService,
    annotationLinks: annotationLinkService,
  });
