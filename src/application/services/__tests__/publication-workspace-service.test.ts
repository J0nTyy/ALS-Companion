import { describe, expect, it } from "vitest";

import { NotFoundError } from "@/application/errors";
import type { StudiesService } from "@/application/services/studies-service";
import type { AnimalsService } from "@/application/services/animals-service";
import type { ObservationsService } from "@/application/services/observations-service";
import type { TimelineEventsService } from "@/application/services/timeline-events-service";
import type { ProtocolTemplateService } from "@/application/services/protocol-template-service";
import type { MriSessionService } from "@/application/services/mri-session-service";
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
  event,
  file,
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
  const o1 = observation("o1", "a1");
  const eventsByAnimal: Record<string, ReturnType<typeof event>[]> = {
    a1: [e1, e2],
    a2: [e3],
  };
  const observationsByAnimal: Record<string, ReturnType<typeof observation>[]> = {
    a1: [o1],
    a2: [],
  };
  const sessionsByEvent: Record<string, ReturnType<typeof session>[]> = {
    e1: [session("m1", "e1")],
    e3: [session("m2", "e3")],
  };
  const assetsBySession: Record<string, ReturnType<typeof asset>[]> = {
    m1: [asset("r1", "m1")],
    m2: [asset("r2", "m2")],
  };
  const filesByAsset: Record<string, ReturnType<typeof file>[]> = {
    r1: [file("f1", "r1")],
    r2: [],
  };
  const annotationsByFile: Record<string, Annotation[]> = {
    f1: [annotation("an1", "f1")],
  };

  const sessionEventQueries: string[] = [];

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
    researchAssets: {
      listByOwner: async (_type: string, id: string) => assetsBySession[id] ?? [],
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

  return { service: createPublicationWorkspaceService(deps), sessionEventQueries };
}

describe("PublicationWorkspaceService.loadStudy", () => {
  it("composes the services into the full study contents", async () => {
    const { service } = makeService();
    const c = await service.loadStudy("s1");

    expect(c.study.id).toBe("s1");
    expect(c.protocol?.steps).toHaveLength(2);
    expect(c.animals.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(c.timelineEvents.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"]);
    expect(c.observations.map((o) => o.id)).toEqual(["o1"]);
    expect(c.mriSessions.map((m) => m.id).sort()).toEqual(["m1", "m2"]);
    expect(c.annotations.map((a) => a.id)).toEqual(["an1"]);
    expect(c.researchAssets.map((r) => r.id).sort()).toEqual(["r1", "r2"]);
    expect(c.storedFiles.map((f) => f.id)).toEqual(["f1"]);
  });

  it("only queries MRI sessions for MRI-category timeline events", async () => {
    const { service, sessionEventQueries } = makeService();
    await service.loadStudy("s1");
    // e2 is a behavioural assessment — it must NOT be queried for sessions.
    expect(sessionEventQueries.sort()).toEqual(["e1", "e3"]);
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
