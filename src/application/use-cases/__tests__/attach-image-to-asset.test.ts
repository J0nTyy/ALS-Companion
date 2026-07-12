import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { MRISession } from "@/domain/entities/mri-session";
import type { ResearchAsset } from "@/domain/entities/research-asset";
import type { StoredFile } from "@/domain/entities/stored-file";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type { StorageRepository } from "@/application/ports/storage-repository";
import type {
  FilePicker,
  FileStore,
  PickedFile,
} from "@/application/ports/file-storage";
import type { StorageUseCaseDeps } from "@/application/use-cases/deps";
import {
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import { attachImageToAsset } from "@/application/use-cases/attach-image-to-asset";

class FakeStorageRepository implements StorageRepository {
  readonly files = new Map<string, StoredFile>();
  async listByAsset(researchAssetId: string): Promise<StoredFile[]> {
    return [...this.files.values()]
      .filter((f) => f.researchAssetId === researchAssetId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getLatestByAsset(researchAssetId: string): Promise<StoredFile | null> {
    return (await this.listByAsset(researchAssetId))[0] ?? null;
  }
  async getById(id: string): Promise<StoredFile | null> {
    return this.files.get(id) ?? null;
  }
  async create(file: StoredFile): Promise<void> {
    this.files.set(file.id, file);
  }
}

class FakeResearchAssetRepository implements ResearchAssetRepository {
  readonly updated: ResearchAsset[] = [];
  constructor(private current: ResearchAsset | null) {}
  async listByOwner(): Promise<ResearchAsset[]> {
    return [];
  }
  async getById(id: string): Promise<ResearchAsset | null> {
    return this.current && this.current.id === id ? this.current : null;
  }
  async create(): Promise<void> {}
  async update(asset: ResearchAsset): Promise<void> {
    this.updated.push(asset);
    this.current = asset;
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
function asset(status: ResearchAsset["status"] = "planned"): ResearchAsset {
  return {
    id: "asset1",
    ownerType: "mri_session",
    ownerId: "mri1",
    assetType: "mri_image",
    title: "T2 series",
    status,
    createdAt: "t",
    updatedAt: "t",
  };
}

let idCounter = 0;
beforeEach(() => {
  idCounter = 0;
});

interface SetupOptions {
  asset?: ResearchAsset | null;
  study?: Study;
  picked?: PickedFile | null;
  now?: string;
}

function setup(options: SetupOptions = {}) {
  const storage = new FakeStorageRepository();
  const assets = new FakeResearchAssetRepository(
    options.asset !== undefined ? options.asset : asset(),
  );
  const saves: Array<{ sourcePath: string; relativePath: string }> = [];
  const fileStore: FileStore = {
    async save(input) {
      saves.push(input);
    },
    async resolveDisplayUrl(relativePath) {
      return `asset://${relativePath}`;
    },
  };
  const pickerResult =
    options.picked !== undefined
      ? options.picked
      : { path: "/tmp/scan.png", name: "scan.png" };
  const pickerState = { calls: 0 };
  const filePicker: FilePicker = {
    async pickImage() {
      pickerState.calls += 1;
      return pickerResult;
    },
  };
  const now = options.now ?? "2026-07-13T00:00:00.000Z";
  const deps: StorageUseCaseDeps = {
    storage,
    fileStore,
    filePicker,
    researchAssets: assets,
    mriSessions: { async getById() { return mriSession; } },
    timelineEvents: { async getById() { return timelineEvent; } },
    animals: { async getById() { return animal(); } },
    studies: { async getById() { return options.study ?? study(); } },
    clock: { now: () => now },
    ids: { next: () => `file-${++idCounter}` },
  };
  return { deps, storage, assets, saves, pickerState };
}

describe("attachImageToAsset", () => {
  it("copies the file, records metadata, and flips the asset to attached", async () => {
    const { deps, storage, assets, saves } = setup();
    const file = await attachImageToAsset(deps, "asset1");

    expect(file).not.toBeNull();
    expect(file?.id).toBe("file-1");
    expect(file?.researchAssetId).toBe("asset1");
    expect(file?.relativePath).toBe("images/file-1.png");
    expect(file?.originalName).toBe("scan.png");
    expect(file?.mimeType).toBe("image/png");
    expect(file?.storageType).toBe("local_managed");
    expect(file?.createdAt).toBe("2026-07-13T00:00:00.000Z");

    // Bytes copied before the row was recorded, into managed storage.
    expect(saves).toEqual([
      { sourcePath: "/tmp/scan.png", relativePath: "images/file-1.png" },
    ]);
    expect(await storage.getLatestByAsset("asset1")).toEqual(file);

    // Status transition is system-controlled and happens once.
    expect(assets.updated).toHaveLength(1);
    expect(assets.updated[0]?.status).toBe("attached");
  });

  it("lower-cases the extension and maps jpg → image/jpeg", async () => {
    const { deps } = setup({ picked: { path: "/x/Scan.JPG", name: "Scan.JPG" } });
    const file = await attachImageToAsset(deps, "asset1");
    expect(file?.mimeType).toBe("image/jpeg");
    expect(file?.relativePath).toBe("images/file-1.jpg");
  });

  it("returns null and records nothing when the picker is cancelled", async () => {
    const { deps, storage, assets, saves } = setup({ picked: null });
    const file = await attachImageToAsset(deps, "asset1");
    expect(file).toBeNull();
    expect(saves).toEqual([]);
    expect(storage.files.size).toBe(0);
    expect(assets.updated).toEqual([]);
  });

  it("rejects an unsupported file type without copying or recording", async () => {
    const { deps, storage, assets, saves } = setup({
      picked: { path: "/x/report.pdf", name: "report.pdf" },
    });
    await expect(attachImageToAsset(deps, "asset1")).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(saves).toEqual([]);
    expect(storage.files.size).toBe(0);
    expect(assets.updated).toEqual([]);
  });

  it("refuses when the asset does not exist (and never prompts)", async () => {
    const { deps, pickerState } = setup({ asset: null });
    await expect(attachImageToAsset(deps, "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(pickerState.calls).toBe(0);
  });

  it("refuses when the owning study is archived (and never prompts)", async () => {
    const { deps, pickerState } = setup({ study: study("archived") });
    await expect(attachImageToAsset(deps, "asset1")).rejects.toBeInstanceOf(
      StudyArchivedError,
    );
    expect(pickerState.calls).toBe(0);
  });

  it("does not rewrite the status when the asset is already attached", async () => {
    const { deps, assets, storage } = setup({ asset: asset("attached") });
    const file = await attachImageToAsset(deps, "asset1");
    expect(file).not.toBeNull();
    expect(storage.files.size).toBe(1);
    expect(assets.updated).toEqual([]);
  });

  it("does not record or flip status if the copy fails", async () => {
    const { deps, storage, assets } = setup();
    deps.fileStore.save = async () => {
      throw new Error("disk full");
    };
    await expect(attachImageToAsset(deps, "asset1")).rejects.toThrow("disk full");
    expect(storage.files.size).toBe(0);
    expect(assets.updated).toEqual([]);
  });
});
