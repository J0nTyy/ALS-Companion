import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { MRISession } from "@/domain/entities/mri-session";
import type { ResearchAsset } from "@/domain/entities/research-asset";
import type { StoredFile } from "@/domain/entities/stored-file";
import type { Annotation } from "@/domain/entities/annotation";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import type { MRISessionReader } from "@/application/ports/mri-session-repository";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type { StorageRepository } from "@/application/ports/storage-repository";
import type { AnnotationRepository } from "@/application/ports/annotation-repository";
import type { AnnotationUseCaseDeps } from "@/application/use-cases/deps";
import {
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import { createAnnotation } from "@/application/use-cases/create-annotation";
import { updateAnnotation } from "@/application/use-cases/update-annotation";
import { getAnnotation } from "@/application/use-cases/get-annotation";
import { listAnnotations } from "@/application/use-cases/list-annotations";
import { deleteAnnotation } from "@/application/use-cases/delete-annotation";

class FakeAnnotationRepository implements AnnotationRepository {
  readonly annotations = new Map<string, Annotation>();
  async listByStoredFile(storedFileId: string): Promise<Annotation[]> {
    return [...this.annotations.values()].filter(
      (a) => a.storedFileId === storedFileId,
    );
  }
  async getById(id: string): Promise<Annotation | null> {
    return this.annotations.get(id) ?? null;
  }
  async create(annotation: Annotation): Promise<void> {
    this.annotations.set(annotation.id, annotation);
  }
  async update(annotation: Annotation): Promise<void> {
    if (!this.annotations.has(annotation.id)) {
      throw new NotFoundError("That annotation could not be found.");
    }
    this.annotations.set(annotation.id, annotation);
  }
  async delete(id: string): Promise<void> {
    this.annotations.delete(id);
  }
}

const storedFile: StoredFile = {
  id: "file1",
  researchAssetId: "asset1",
  storageType: "local_managed",
  relativePath: "images/file1.png",
  originalName: "scan.png",
  mimeType: "image/png",
  createdAt: "t",
};
const researchAsset: ResearchAsset = {
  id: "asset1",
  ownerType: "mri_session",
  ownerId: "mri1",
  assetType: "mri_image",
  title: "Baseline MRI",
  status: "attached",
  createdAt: "t",
  updatedAt: "t",
};
const mriSession: MRISession = {
  id: "mri1",
  timelineEventId: "tl1",
  title: "Baseline MRI",
  modality: "mri",
  acquisitionDate: "2026-07-10",
  createdAt: "t",
  updatedAt: "t",
};
const timelineEvent: TimelineEvent = {
  id: "tl1",
  animalId: "an1",
  title: "MRI scan",
  category: "mri",
  status: "planned",
  createdAt: "t",
  updatedAt: "t",
};

/** Minimal storage repo exposing just what the annotation use cases touch. */
function storageReader(file: StoredFile | null): StorageRepository {
  return {
    async getById() {
      return file;
    },
    async listByAsset() {
      return file ? [file] : [];
    },
    async getLatestByAsset() {
      return file;
    },
    async create() {},
    async delete() {},
  };
}
function assetReader(asset: ResearchAsset | null): ResearchAssetRepository {
  return {
    async getById() {
      return asset;
    },
    async listByOwner() {
      return asset ? [asset] : [];
    },
    async create() {},
    async update() {},
    async delete() {},
  };
}
function mriReader(session: MRISession | null): MRISessionReader {
  return { async getById() { return session; } };
}
function timelineReader(event: TimelineEvent | null): TimelineEventReader {
  return { async getById() { return event; } };
}
function animalReader(a: Animal | null): AnimalReader {
  return { async getById() { return a; } };
}
function studyReader(s: Study | null): StudyReader {
  return { async getById() { return s; } };
}
function animal(): Animal {
  return {
    id: "an1",
    studyId: "s1",
    animalIdentifier: "M-1",
    sex: "unknown",
    createdAt: "t",
    updatedAt: "t",
  };
}
function study(status: Study["status"] = "active"): Study {
  return { id: "s1", name: "S", strain: "X", status, createdAt: "t", updatedAt: "t" };
}

let repo: FakeAnnotationRepository;
let idCounter = 0;

interface DepsOptions {
  now?: string;
  file?: StoredFile | null;
  asset?: ResearchAsset | null;
  study?: Study | null;
}

function makeDeps(options: DepsOptions = {}): AnnotationUseCaseDeps {
  const now = options.now ?? "2026-07-13T00:00:00.000Z";
  return {
    repository: repo,
    storage: storageReader(options.file !== undefined ? options.file : storedFile),
    researchAssets: assetReader(
      options.asset !== undefined ? options.asset : researchAsset,
    ),
    mriSessions: mriReader(mriSession),
    // Annotation tests use an mri_session owner, so the histology reader is never
    // consulted — a null stub satisfies the deps bundle.
    histologySessions: { async getById() { return null; } },
    timelineEvents: timelineReader(timelineEvent),
    animals: animalReader(animal()),
    studies: studyReader(options.study !== undefined ? options.study : study()),
    annotationLinks: {
      async listByAnnotation() {
        return [];
      },
      async listForAnnotations() {
        return [];
      },
      async findBetween() {
        return null;
      },
      async getById() {
        return null;
      },
      async create() {},
      async delete() {},
      async deleteForAnnotation() {},
    },
    clock: { now: () => now },
    ids: { next: () => `ann-${++idCounter}` },
  };
}

beforeEach(() => {
  repo = new FakeAnnotationRepository();
  idCounter = 0;
});

describe("createAnnotation", () => {
  it("creates a point with generated id/timestamps and inferred type", async () => {
    const annotation = await createAnnotation(makeDeps(), {
      storedFileId: "file1",
      annotationType: "point",
      geometry: { kind: "point", x: 0.5, y: 0.5 },
      label: "  Lesion ",
    });
    expect(annotation.id).toBe("ann-1");
    expect(annotation.annotationType).toBe("point");
    expect(annotation.label).toBe("Lesion");
    expect(annotation.createdAt).toBe("2026-07-13T00:00:00.000Z");
    expect(repo.annotations.get("ann-1")).toEqual(annotation);
  });

  it("creates a rectangle annotation", async () => {
    const annotation = await createAnnotation(makeDeps(), {
      storedFileId: "file1",
      annotationType: "rectangle",
      geometry: { kind: "rectangle", x: 0.1, y: 0.1, width: 0.3, height: 0.2 },
    });
    expect(annotation.annotationType).toBe("rectangle");
    expect(annotation.geometry.kind).toBe("rectangle");
  });

  it("rejects invalid geometry", async () => {
    await expect(
      createAnnotation(makeDeps(), {
        storedFileId: "file1",
        annotationType: "point",
        geometry: { kind: "point", x: 5, y: 0 },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses when the stored file is missing", async () => {
    await expect(
      createAnnotation(makeDeps({ file: null }), {
        storedFileId: "missing",
        annotationType: "point",
        geometry: { kind: "point", x: 0.5, y: 0.5 },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses when the research asset is missing", async () => {
    await expect(
      createAnnotation(makeDeps({ asset: null }), {
        storedFileId: "file1",
        annotationType: "point",
        geometry: { kind: "point", x: 0.5, y: 0.5 },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses when the owning study is archived", async () => {
    await expect(
      createAnnotation(makeDeps({ study: study("archived") }), {
        storedFileId: "file1",
        annotationType: "point",
        geometry: { kind: "point", x: 0.5, y: 0.5 },
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("updateAnnotation", () => {
  async function seed(): Promise<Annotation> {
    return createAnnotation(makeDeps(), {
      storedFileId: "file1",
      annotationType: "point",
      geometry: { kind: "point", x: 0.5, y: 0.5 },
      label: "Old",
      notes: "Old notes",
    });
  }

  it("updates label/notes/geometry, refreshes updatedAt, preserves createdAt", async () => {
    const created = await seed();
    const updated = await updateAnnotation(makeDeps({ now: "2026-08-01T00:00:00.000Z" }), {
      id: created.id,
      annotationType: "rectangle",
      geometry: { kind: "rectangle", x: 0, y: 0, width: 0.5, height: 0.5 },
      label: "New",
    });
    expect(updated.label).toBe("New");
    expect(updated.notes).toBeUndefined(); // cleared (not provided)
    expect(updated.annotationType).toBe("rectangle");
    expect(updated.storedFileId).toBe("file1");
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("throws NotFoundError for a missing annotation", async () => {
    await expect(
      updateAnnotation(makeDeps(), {
        id: "missing",
        annotationType: "point",
        geometry: { kind: "point", x: 0.5, y: 0.5 },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses when the owning study is archived", async () => {
    const created = await seed();
    await expect(
      updateAnnotation(makeDeps({ study: study("archived") }), {
        id: created.id,
        annotationType: "point",
        geometry: { kind: "point", x: 0.1, y: 0.1 },
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("get / list", () => {
  it("gets by id and lists by stored file", async () => {
    const created = await createAnnotation(makeDeps(), {
      storedFileId: "file1",
      annotationType: "point",
      geometry: { kind: "point", x: 0.5, y: 0.5 },
    });
    expect(await getAnnotation(makeDeps(), created.id)).toEqual(created);
    expect(await getAnnotation(makeDeps(), "missing")).toBeNull();
    expect(await listAnnotations(makeDeps(), "file1")).toHaveLength(1);
    expect(await listAnnotations(makeDeps(), "other")).toHaveLength(0);
  });
});

describe("deleteAnnotation", () => {
  it("deletes an existing annotation", async () => {
    const created = await createAnnotation(makeDeps(), {
      storedFileId: "file1",
      annotationType: "point",
      geometry: { kind: "point", x: 0.5, y: 0.5 },
    });
    await deleteAnnotation(makeDeps(), created.id);
    expect(repo.annotations.has(created.id)).toBe(false);
  });

  it("throws NotFoundError for a missing annotation", async () => {
    await expect(deleteAnnotation(makeDeps(), "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("refuses when the owning study is archived", async () => {
    const created = await createAnnotation(makeDeps(), {
      storedFileId: "file1",
      annotationType: "point",
      geometry: { kind: "point", x: 0.5, y: 0.5 },
    });
    await expect(
      deleteAnnotation(makeDeps({ study: study("archived") }), created.id),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});
