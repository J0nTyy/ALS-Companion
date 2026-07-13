import { describe, expect, it } from "vitest";

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
import type { Annotation } from "@/domain/entities/annotation";
import { createPublicationWorkspaceService } from "@/application/services/publication-workspace-service";
import {
  animal,
  annotation,
  asset,
  biomarkerResult,
  biomarkerSample,
  event,
  file,
  histologySession,
  observation,
  protocol,
  session,
  study,
} from "@/application/use-cases/publication/__tests__/fixtures";

function makeService() {
  const studies = study();
  const a1 = animal("a1");
  const a2 = animal("a2");
  const e1 = event("e1", "a1", { category: "mri" });
  const e2 = event("e2", "a1", { category: "behavioral_assessment" });
  const e3 = event("e3", "a2", { category: "mri" });
  const e4 = event("e4", "a2", { category: "histopathology" });
  const e5 = event("e5", "a2", { category: "biochemical_analysis" });
  const o1 = observation("o1", "a1");
  const eventsByAnimal: Record<string, ReturnType<typeof event>[]> = {
    a1: [e1, e2],
    a2: [e3, e4, e5],
  };
  const observationsByAnimal: Record<string, ReturnType<typeof observation>[]> = {
    a1: [o1],
    a2: [],
  };
  const sessionsByEvent: Record<string, ReturnType<typeof session>[]> = {
    e1: [session("m1", "e1")],
    e3: [session("m2", "e3")],
  };
  const histologyByEvent: Record<
    string,
    ReturnType<typeof histologySession>[]
  > = {
    e4: [histologySession("h1", "e4")],
  };
  // Assets keyed by owner id (MRI session ids and histology session ids are distinct).
  const assetsByOwner: Record<string, ReturnType<typeof asset>[]> = {
    m1: [asset("r1", "m1")],
    m2: [asset("r2", "m2")],
    h1: [
      asset("rH", "h1", {
        ownerType: "histology_session",
        assetType: "histology_image",
      }),
    ],
  };
  const filesByAsset: Record<string, ReturnType<typeof file>[]> = {
    r1: [file("f1", "r1")],
    r2: [],
    rH: [file("fH", "rH")],
  };
  const annotationsByFile: Record<string, Annotation[]> = {
    f1: [annotation("an1", "f1")],
    fH: [annotation("anH", "fH")],
  };

  const samplesByEvent: Record<
    string,
    ReturnType<typeof biomarkerSample>[]
  > = {
    e5: [biomarkerSample("bs1", "e5")],
  };
  const resultsBySample: Record<
    string,
    ReturnType<typeof biomarkerResult>[]
  > = {
    bs1: [biomarkerResult("br1", "bs1"), biomarkerResult("br2", "bs1")],
  };

  const sessionEventQueries: string[] = [];
  const histologyEventQueries: string[] = [];
  const biomarkerEventQueries: string[] = [];

  const deps = {
    studies: {
      list: async () => [studies],
      get: async (id: string) => (id === "s1" ? studies : null),
    } as unknown as StudiesService,
    animals: {
      listByStudy: async () => [a1, a2],
    } as unknown as AnimalsService,
    observations: {
      listByAnimal: async (id: string) => observationsByAnimal[id] ?? [],
    } as unknown as ObservationsService,
    timelineEvents: {
      listByAnimal: async (id: string) => eventsByAnimal[id] ?? [],
    } as unknown as TimelineEventsService,
    protocols: {
      getForStudy: async () => protocol(),
    } as unknown as ProtocolTemplateService,
    mriSessions: {
      listByTimelineEvent: async (id: string) => {
        sessionEventQueries.push(id);
        return sessionsByEvent[id] ?? [];
      },
    } as unknown as MriSessionService,
    histologySessions: {
      listByTimelineEvent: async (id: string) => {
        histologyEventQueries.push(id);
        return histologyByEvent[id] ?? [];
      },
    } as unknown as HistologySessionService,
    biomarkers: {
      listSamples: async (id: string) => {
        biomarkerEventQueries.push(id);
        return samplesByEvent[id] ?? [];
      },
      listResults: async (id: string) => resultsBySample[id] ?? [],
    } as unknown as BiomarkerService,
    researchAssets: {
      listByOwner: async (_type: string, id: string) => assetsByOwner[id] ?? [],
    } as unknown as ResearchAssetService,
    storage: {
      listFiles: async (id: string) => filesByAsset[id] ?? [],
    } as unknown as StorageService,
    annotations: {
      listByStoredFile: async (id: string) => annotationsByFile[id] ?? [],
    } as unknown as AnnotationService,
    annotationLinks: {
      listLinksForAnnotations: async () => [],
    } as unknown as AnnotationLinkService,
  };

  return {
    service: createPublicationWorkspaceService(deps),
    sessionEventQueries,
    histologyEventQueries,
    biomarkerEventQueries,
  };
}

describe("PublicationWorkspaceService.loadStudy", () => {
  it("composes the services into the full study contents", async () => {
    const { service } = makeService();
    const c = await service.loadStudy("s1");

    expect(c.study.id).toBe("s1");
    expect(c.protocol?.steps).toHaveLength(2);
    expect(c.animals.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(c.timelineEvents.map((e) => e.id).sort()).toEqual([
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
    ]);
    expect(c.observations.map((o) => o.id)).toEqual(["o1"]);
    expect(c.mriSessions.map((m) => m.id).sort()).toEqual(["m1", "m2"]);
    expect(c.histologySessions.map((h) => h.id)).toEqual(["h1"]);
    expect(c.biomarkerSamples.map((s) => s.id)).toEqual(["bs1"]);
    expect(c.biomarkerResults.map((r) => r.id).sort()).toEqual(["br1", "br2"]);
    // Annotations + assets + files span both MRI (an1/r1/f1) and histology (anH/rH/fH).
    expect(c.annotations.map((a) => a.id).sort()).toEqual(["an1", "anH"]);
    expect(c.researchAssets.map((r) => r.id).sort()).toEqual(["r1", "r2", "rH"]);
    expect(c.storedFiles.map((f) => f.id).sort()).toEqual(["f1", "fH"]);
  });

  it("queries each session type only for its own event category", async () => {
    const { service, sessionEventQueries, histologyEventQueries, biomarkerEventQueries } =
      makeService();
    await service.loadStudy("s1");
    // MRI sessions only on MRI events (not e2 behavioural / e4 histo / e5 biochem).
    expect(sessionEventQueries.sort()).toEqual(["e1", "e3"]);
    // Histology sessions only on the histopathology event.
    expect(histologyEventQueries.sort()).toEqual(["e4"]);
    // Biomarker samples only on the biochemical-analysis event.
    expect(biomarkerEventQueries.sort()).toEqual(["e5"]);
  });

  it("throws NotFoundError when the study does not exist", async () => {
    const { service } = makeService();
    await expect(service.loadStudy("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("PublicationWorkspaceService.listStudies", () => {
  it("returns the studies to choose from", async () => {
    const { service } = makeService();
    expect((await service.listStudies()).map((s) => s.id)).toEqual(["s1"]);
  });
});
