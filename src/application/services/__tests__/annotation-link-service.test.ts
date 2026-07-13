import { beforeEach, describe, expect, it } from "vitest";

import type { AnnotationLink } from "@/domain/entities/annotation-link";
import type { AnnotationLinkRepository } from "@/application/ports/annotation-link-repository";
import type {
  AnnotatedContext,
  AnnotationContextReader,
} from "@/application/ports/annotation-context-reader";
import type { StudyStatus } from "@/domain/entities/study";
import {
  ConflictError,
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import {
  createAnnotationLinkService,
  type AnnotationLinkService,
} from "@/application/services/annotation-link-service";

class FakeLinkRepository implements AnnotationLinkRepository {
  readonly links = new Map<string, AnnotationLink>();
  private touches(link: AnnotationLink, id: string) {
    return link.sourceAnnotationId === id || link.targetAnnotationId === id;
  }
  async listByAnnotation(id: string) {
    return [...this.links.values()].filter((l) => this.touches(l, id));
  }
  async listForAnnotations(ids: readonly string[]) {
    return [...this.links.values()].filter((l) =>
      ids.some((id) => this.touches(l, id)),
    );
  }
  async findBetween(a: string, b: string) {
    return (
      [...this.links.values()].find(
        (l) => this.touches(l, a) && this.touches(l, b),
      ) ?? null
    );
  }
  async getById(id: string) {
    return this.links.get(id) ?? null;
  }
  async create(link: AnnotationLink) {
    this.links.set(link.id, link);
  }
  async delete(id: string) {
    this.links.delete(id);
  }
  async deleteForAnnotation(id: string) {
    for (const [linkId, link] of this.links) {
      if (this.touches(link, id)) this.links.delete(linkId);
    }
  }
}

function context(
  id: string,
  opts: {
    animalId: string;
    date: string;
    status?: StudyStatus;
    label?: string;
    sessionTitle?: string;
  },
): AnnotatedContext {
  return {
    annotationId: id,
    label: opts.label ?? null,
    annotationType: "point",
    storedFileId: `file-${id}`,
    studyId: "s1",
    studyName: "Study 1",
    studyStatus: opts.status ?? "active",
    animalId: opts.animalId,
    animalIdentifier: opts.animalId,
    timelineEventId: `te-${id}`,
    mriSessionId: `m-${id}`,
    mriSessionTitle: opts.sessionTitle ?? `Session ${id}`,
    acquisitionDate: opts.date,
  };
}

class FakeContextReader implements AnnotationContextReader {
  constructor(private readonly contexts: Map<string, AnnotatedContext>) {}
  async getContext(id: string) {
    return this.contexts.get(id) ?? null;
  }
  async listSiblingCandidates(id: string) {
    const self = this.contexts.get(id);
    if (!self) return [];
    return [...this.contexts.values()]
      .filter((c) => c.animalId === self.animalId && c.annotationId !== id)
      .sort((a, b) => a.acquisitionDate.localeCompare(b.acquisitionDate));
  }
}

let repo: FakeLinkRepository;
let idCounter: number;
let service: AnnotationLinkService;

// a1/a2/a3 share an animal (AN1) at different dates; a4 is a different animal;
// a5's study is archived.
const CONTEXTS = new Map<string, AnnotatedContext>([
  ["a1", context("a1", { animalId: "AN1", date: "2026-01-01" })],
  ["a2", context("a2", { animalId: "AN1", date: "2026-03-01" })],
  ["a3", context("a3", { animalId: "AN1", date: "2026-02-01" })],
  ["a4", context("a4", { animalId: "AN2", date: "2026-01-01" })],
  ["a5", context("a5", { animalId: "AN1", date: "2026-04-01", status: "archived" })],
]);

beforeEach(() => {
  repo = new FakeLinkRepository();
  idCounter = 0;
  service = createAnnotationLinkService({
    repository: repo,
    context: new FakeContextReader(CONTEXTS),
    clock: { now: () => "2026-07-13T00:00:00.000Z" },
    ids: { next: () => `link-${++idCounter}` },
  });
});

describe("createAnnotationLink", () => {
  it("creates a directional link with generated id + timestamp", async () => {
    const link = await service.create({
      sourceAnnotationId: "a1",
      targetAnnotationId: "a2",
      relationshipType: "follow_up",
      notes: "  grew ",
    });
    expect(link.id).toBe("link-1");
    expect(link.sourceAnnotationId).toBe("a1");
    expect(link.targetAnnotationId).toBe("a2");
    expect(link.notes).toBe("grew");
    expect(repo.links.get("link-1")).toEqual(link);
  });

  it("rejects linking an annotation to itself", async () => {
    await expect(
      service.create({
        sourceAnnotationId: "a1",
        targetAnnotationId: "a1",
        relationshipType: "related",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a missing source or target annotation", async () => {
    await expect(
      service.create({
        sourceAnnotationId: "nope",
        targetAnnotationId: "a2",
        relationshipType: "related",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      service.create({
        sourceAnnotationId: "a1",
        targetAnnotationId: "nope",
        relationshipType: "related",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses when the source annotation's study is archived", async () => {
    await expect(
      service.create({
        sourceAnnotationId: "a5",
        targetAnnotationId: "a1",
        relationshipType: "related",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });

  it("prevents a duplicate link in EITHER direction", async () => {
    await service.create({
      sourceAnnotationId: "a1",
      targetAnnotationId: "a2",
      relationshipType: "follow_up",
    });
    await expect(
      service.create({
        sourceAnnotationId: "a2",
        targetAnnotationId: "a1",
        relationshipType: "baseline",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects an unknown relationship type", async () => {
    await expect(
      service.create({
        sourceAnnotationId: "a1",
        targetAnnotationId: "a2",
        // @ts-expect-error — deliberately invalid to test validation
        relationshipType: "sibling",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("getLinkedTimeline", () => {
  it("resolves linked partners with context, ordered by acquisition date, with direction", async () => {
    await service.create({
      sourceAnnotationId: "a1",
      targetAnnotationId: "a2",
      relationshipType: "follow_up",
    });
    await service.create({
      sourceAnnotationId: "a3",
      targetAnnotationId: "a1",
      relationshipType: "baseline",
    });
    const timeline = await service.getLinkedTimeline("a1");
    expect(timeline.map((e) => e.context.annotationId)).toEqual(["a3", "a2"]); // 02-01 then 03-01
    expect(timeline[0]?.direction).toBe("incoming"); // a3 → a1
    expect(timeline[1]?.direction).toBe("outgoing"); // a1 → a2
  });
});

describe("getLinkCandidates", () => {
  it("returns same-animal siblings, excluding self and already-linked", async () => {
    const before = await service.getLinkCandidates("a1");
    expect(before.map((c) => c.annotationId)).toEqual(["a3", "a2", "a5"]); // AN1 siblings by date
    await service.create({
      sourceAnnotationId: "a1",
      targetAnnotationId: "a2",
      relationshipType: "follow_up",
    });
    const after = await service.getLinkCandidates("a1");
    expect(after.map((c) => c.annotationId)).toEqual(["a3", "a5"]); // a2 now linked
  });
});

describe("deleteAnnotationLink", () => {
  it("removes a link", async () => {
    const link = await service.create({
      sourceAnnotationId: "a1",
      targetAnnotationId: "a2",
      relationshipType: "related",
    });
    await service.delete(link.id);
    expect(repo.links.has(link.id)).toBe(false);
  });

  it("throws for a missing link", async () => {
    await expect(service.delete("nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});
