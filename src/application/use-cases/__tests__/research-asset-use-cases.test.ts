import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { MRISession } from "@/domain/entities/mri-session";
import type { ResearchAsset } from "@/domain/entities/research-asset";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import type { MRISessionReader } from "@/application/ports/mri-session-repository";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type { ResearchAssetUseCaseDeps } from "@/application/use-cases/deps";
import {
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import { createResearchAsset } from "@/application/use-cases/create-research-asset";
import { updateResearchAsset } from "@/application/use-cases/update-research-asset";
import { listResearchAssets } from "@/application/use-cases/list-research-assets";

class FakeResearchAssetRepository implements ResearchAssetRepository {
  readonly assets = new Map<string, ResearchAsset>();
  async listByOwner(
    ownerType: ResearchAsset["ownerType"],
    ownerId: string,
  ): Promise<ResearchAsset[]> {
    return [...this.assets.values()].filter(
      (a) => a.ownerType === ownerType && a.ownerId === ownerId,
    );
  }
  async getById(id: string): Promise<ResearchAsset | null> {
    return this.assets.get(id) ?? null;
  }
  async create(asset: ResearchAsset): Promise<void> {
    this.assets.set(asset.id, asset);
  }
  async update(asset: ResearchAsset): Promise<void> {
    if (!this.assets.has(asset.id)) {
      throw new NotFoundError("That research asset could not be found.");
    }
    this.assets.set(asset.id, asset);
  }
  async delete(id: string): Promise<void> {
    this.assets.delete(id);
  }
}

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

let repo: FakeResearchAssetRepository;
// Module-level so ids stay unique across multiple makeDeps() calls in one test.
let idCounter = 0;

interface DepsOptions {
  now?: string;
  session?: MRISession | null;
  event?: TimelineEvent | null;
  animal?: Animal | null;
  study?: Study | null;
}

function makeDeps(options: DepsOptions = {}): ResearchAssetUseCaseDeps {
  const now = options.now ?? "2026-07-13T00:00:00.000Z";
  return {
    repository: repo,
    mriSessions: mriReader(
      options.session !== undefined ? options.session : mriSession,
    ),
    timelineEvents: timelineReader(
      options.event !== undefined ? options.event : timelineEvent,
    ),
    animals: animalReader(
      options.animal !== undefined ? options.animal : animal(),
    ),
    studies: studyReader(options.study !== undefined ? options.study : study()),
    clock: { now: () => now },
    ids: { next: () => `asset-${++idCounter}` },
  };
}

beforeEach(() => {
  repo = new FakeResearchAssetRepository();
  idCounter = 0;
});

describe("createResearchAsset", () => {
  it("creates a metadata placeholder with generated id/timestamps and defaults", async () => {
    const asset = await createResearchAsset(makeDeps(), {
      ownerType: "mri_session",
      ownerId: "mri1",
      assetType: "mri_image",
      title: "  Baseline T2 series ",
    });
    expect(asset.id).toBe("asset-1");
    expect(asset.ownerType).toBe("mri_session");
    expect(asset.ownerId).toBe("mri1");
    expect(asset.assetType).toBe("mri_image");
    expect(asset.title).toBe("Baseline T2 series");
    expect(asset.status).toBe("planned");
    expect(asset.description).toBeUndefined();
    expect(asset.createdAt).toBe("2026-07-13T00:00:00.000Z");
    expect(await repo.getById("asset-1")).toEqual(asset);
  });

  it("refuses when the owning MRI session does not exist", async () => {
    await expect(
      createResearchAsset(makeDeps({ session: null }), {
        ownerType: "mri_session",
        ownerId: "missing",
        assetType: "mri_image",
        title: "x",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.assets.size).toBe(0);
  });

  it("refuses when the owner's timeline event is missing", async () => {
    await expect(
      createResearchAsset(makeDeps({ event: null }), {
        ownerType: "mri_session",
        ownerId: "mri1",
        assetType: "mri_image",
        title: "x",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses when the study is archived", async () => {
    await expect(
      createResearchAsset(makeDeps({ study: study("archived") }), {
        ownerType: "mri_session",
        ownerId: "mri1",
        assetType: "mri_image",
        title: "x",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });

  it('rejects the reserved "attached" status', async () => {
    await expect(
      createResearchAsset(makeDeps(), {
        ownerType: "mri_session",
        ownerId: "mri1",
        assetType: "mri_image",
        title: "x",
        status: "attached",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.assets.size).toBe(0);
  });
});

describe("updateResearchAsset", () => {
  it("preserves owner and createdAt, refreshes updatedAt, and clears description", async () => {
    const created = await createResearchAsset(
      makeDeps({ now: "2026-01-01T00:00:00.000Z" }),
      {
        ownerType: "mri_session",
        ownerId: "mri1",
        assetType: "mri_image",
        title: "Baseline",
        description: "first",
      },
    );
    const updated = await updateResearchAsset(
      makeDeps({ now: "2026-02-02T00:00:00.000Z" }),
      {
        id: created.id,
        assetType: "spreadsheet",
        title: "Volumetrics",
        status: "pending_attachment",
      },
    );
    expect(updated.ownerType).toBe("mri_session");
    expect(updated.ownerId).toBe("mri1");
    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.assetType).toBe("spreadsheet");
    expect(updated.status).toBe("pending_attachment");
    // Description not supplied on update — it is cleared.
    expect(updated.description).toBeUndefined();
  });

  it("throws NotFoundError for a missing asset", async () => {
    await expect(
      updateResearchAsset(makeDeps(), {
        id: "missing",
        assetType: "mri_image",
        title: "x",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses edits after the study is archived", async () => {
    const created = await createResearchAsset(makeDeps(), {
      ownerType: "mri_session",
      ownerId: "mri1",
      assetType: "mri_image",
      title: "x",
    });
    await expect(
      updateResearchAsset(makeDeps({ study: study("archived") }), {
        id: created.id,
        assetType: "mri_image",
        title: "y",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("listResearchAssets", () => {
  it("returns only the given owner's assets", async () => {
    await createResearchAsset(makeDeps(), {
      ownerType: "mri_session",
      ownerId: "mri1",
      assetType: "mri_image",
      title: "A",
    });
    const other = await createResearchAsset(makeDeps(), {
      ownerType: "mri_session",
      ownerId: "mri2",
      assetType: "mri_image",
      title: "B",
    });
    const list = await listResearchAssets(makeDeps(), "mri_session", "mri1");
    expect(list).toHaveLength(1);
    expect(list.map((a) => a.id)).not.toContain(other.id);
  });
});
