import type { Study } from "@/domain/entities/study";
import { NotFoundError } from "@/application/errors";
import type { StudiesService } from "@/application/services/studies-service";
import type { AnimalsService } from "@/application/services/animals-service";
import type { ObservationsService } from "@/application/services/observations-service";
import type { TimelineEventsService } from "@/application/services/timeline-events-service";
import type { ProtocolTemplateService } from "@/application/services/protocol-template-service";
import type { MriSessionService } from "@/application/services/mri-session-service";
import type { HistologySessionService } from "@/application/services/histology-session-service";
import type { BiomarkerService } from "@/application/services/biomarker-service";
import type { ResearchAssetService } from "@/application/services/research-asset-service";
import type { StorageService } from "@/application/services/storage-service";
import type { AnnotationService } from "@/application/services/annotation-service";
import type { AnnotationLinkService } from "@/application/services/annotation-link-service";
import type { WorkspaceStudyContents } from "@/application/use-cases/publication/publication-package";

/**
 * Collaborators the publication workspace composes. All are EXISTING application
 * services — the workspace is an aggregation layer over them, not a new data path.
 */
export interface PublicationWorkspaceDeps {
  studies: StudiesService;
  animals: AnimalsService;
  observations: ObservationsService;
  timelineEvents: TimelineEventsService;
  protocols: ProtocolTemplateService;
  mriSessions: MriSessionService;
  histologySessions: HistologySessionService;
  biomarkers: BiomarkerService;
  researchAssets: ResearchAssetService;
  storage: StorageService;
  annotations: AnnotationService;
  annotationLinks: AnnotationLinkService;
}

/**
 * Facade the presentation layer depends on to build publication packages. It is
 * the **aggregation layer** that future exports (statistics, CSV/DOCX/PDF, AI
 * reports) will build on. It composes existing services to load one study's full
 * contents; the package assembly / preview / validation are pure functions in
 * `use-cases/publication`. It duplicates no business logic and adds no persistence.
 */
export interface PublicationWorkspaceService {
  /** Studies to choose from (includes archived — any study may be published). */
  listStudies(): Promise<Study[]>;
  /** Load one study's full contents (animals → timeline/observations → MRI →
   *  assets → files, plus the protocol) for selection. */
  loadStudy(studyId: string): Promise<WorkspaceStudyContents>;
  /** Save (or clear) the study's narrative report summary (included in exports). */
  saveStudySummary(studyId: string, summary: string): Promise<void>;
}

export function createPublicationWorkspaceService(
  deps: PublicationWorkspaceDeps,
): PublicationWorkspaceService {
  return {
    listStudies: () => deps.studies.list({ includeArchived: true }),

    async loadStudy(studyId: string): Promise<WorkspaceStudyContents> {
      const study = await deps.studies.get(studyId);
      if (!study) {
        throw new NotFoundError("That study could not be found.");
      }

      const [protocol, animals] = await Promise.all([
        deps.protocols.getForStudy(studyId),
        deps.animals.listByStudy(studyId),
      ]);

      const perAnimal = await Promise.all(
        animals.map(async (animal) => ({
          timeline: await deps.timelineEvents.listByAnimal(animal.id),
          observations: await deps.observations.listByAnimal(animal.id),
        })),
      );
      const timelineEvents = perAnimal.flatMap((p) => p.timeline);
      const observations = perAnimal.flatMap((p) => p.observations);

      // MRI sessions only exist on MRI-category timeline events.
      const mriEvents = timelineEvents.filter((e) => e.category === "mri");
      const mriSessions = (
        await Promise.all(
          mriEvents.map((e) => deps.mriSessions.listByTimelineEvent(e.id)),
        )
      ).flat();

      // Histology sessions only exist on histopathology-category events (v1.9).
      const histologyEvents = timelineEvents.filter(
        (e) => e.category === "histopathology",
      );
      const histologySessions = (
        await Promise.all(
          histologyEvents.map((e) =>
            deps.histologySessions.listByTimelineEvent(e.id),
          ),
        )
      ).flat();

      // Research assets are polymorphic; gather MRI + histology owners into one
      // flat list. The downstream file/annotation loading is owner-agnostic.
      const [mriAssets, histologyAssets] = await Promise.all([
        Promise.all(
          mriSessions.map((m) =>
            deps.researchAssets.listByOwner("mri_session", m.id),
          ),
        ),
        Promise.all(
          histologySessions.map((h) =>
            deps.researchAssets.listByOwner("histology_session", h.id),
          ),
        ),
      ]);
      const researchAssets = [...mriAssets.flat(), ...histologyAssets.flat()];

      // Biomarker samples live on biochemical-analysis events; each has 0+ results (v2.0).
      const biochemicalEvents = timelineEvents.filter(
        (e) => e.category === "biochemical_analysis",
      );
      const biomarkerSamples = (
        await Promise.all(
          biochemicalEvents.map((e) => deps.biomarkers.listSamples(e.id)),
        )
      ).flat();
      const biomarkerResults = (
        await Promise.all(
          biomarkerSamples.map((s) => deps.biomarkers.listResults(s.id)),
        )
      ).flat();

      const storedFiles = (
        await Promise.all(
          researchAssets.map((r) => deps.storage.listFiles(r.id)),
        )
      ).flat();

      // Annotations on those images, and the longitudinal links among them (v1.7).
      const annotations = (
        await Promise.all(
          storedFiles.map((f) => deps.annotations.listByStoredFile(f.id)),
        )
      ).flat();
      const annotationLinks =
        annotations.length > 0
          ? await deps.annotationLinks.listLinksForAnnotations(
              annotations.map((a) => a.id),
            )
          : [];

      return {
        study,
        protocol,
        animals,
        timelineEvents,
        observations,
        mriSessions,
        histologySessions,
        biomarkerSamples,
        biomarkerResults,
        researchAssets,
        storedFiles,
        annotations,
        annotationLinks,
      };
    },

    async saveStudySummary(studyId, summary): Promise<void> {
      await deps.studies.setSummary(studyId, summary);
    },
  };
}
