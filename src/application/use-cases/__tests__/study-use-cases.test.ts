import { beforeEach, describe, expect, it } from "vitest";

import type { Study } from "@/domain/entities/study";
import type {
  StudyListOptions,
  StudyRepository,
} from "@/application/ports/study-repository";
import type { StudyUseCaseDeps } from "@/application/use-cases/deps";
import { NotFoundError, ValidationError } from "@/application/errors";
import { createStudy } from "@/application/use-cases/create-study";
import { updateStudy } from "@/application/use-cases/update-study";
import { archiveStudy } from "@/application/use-cases/archive-study";

/** An in-memory repository so use cases can be tested without SQLite. */
class FakeStudyRepository implements StudyRepository {
  readonly studies = new Map<string, Study>();
  readonly archiveCalls: { id: string; updatedAt: string }[] = [];

  async list(options?: StudyListOptions): Promise<Study[]> {
    const all = [...this.studies.values()];
    return options?.includeArchived
      ? all
      : all.filter((study) => study.status !== "archived");
  }

  async getById(id: string): Promise<Study | null> {
    return this.studies.get(id) ?? null;
  }

  async create(study: Study): Promise<void> {
    this.studies.set(study.id, study);
  }

  async update(study: Study): Promise<void> {
    // Honor the port contract: a missing target must not silently "succeed".
    if (!this.studies.has(study.id)) {
      throw new NotFoundError("That study could not be found.");
    }
    this.studies.set(study.id, study);
  }

  async archive(id: string, updatedAt: string): Promise<void> {
    this.archiveCalls.push({ id, updatedAt });
    const existing = this.studies.get(id);
    if (!existing) {
      throw new NotFoundError("That study could not be found.");
    }
    this.studies.set(id, { ...existing, status: "archived", updatedAt });
  }

  async delete(id: string): Promise<void> {
    this.studies.delete(id);
  }
}

let repo: FakeStudyRepository;

function depsAt(now: string): StudyUseCaseDeps {
  let counter = 0;
  return {
    repository: repo,
    clock: { now: () => now },
    ids: { next: () => `id-${++counter}` },
  };
}

beforeEach(() => {
  repo = new FakeStudyRepository();
});

describe("createStudy", () => {
  it("generates id/timestamps, normalizes fields, and persists", async () => {
    const deps = depsAt("2026-07-12T00:00:00.000Z");
    const study = await createStudy(deps, {
      name: "  Cohort A ",
      strain: " SOD1-G93A ",
    });

    expect(study.id).toBe("id-1");
    expect(study.name).toBe("Cohort A");
    expect(study.strain).toBe("SOD1-G93A");
    expect(study.status).toBe("planning");
    expect(study.createdAt).toBe("2026-07-12T00:00:00.000Z");
    expect(study.updatedAt).toBe(study.createdAt);
    expect(study.description).toBeUndefined();
    expect(await repo.getById("id-1")).toEqual(study);
  });

  it("keeps a provided description", async () => {
    const deps = depsAt("2026-07-12T00:00:00.000Z");
    const study = await createStudy(deps, {
      name: "A",
      strain: "S",
      description: "survival study",
    });
    expect(study.description).toBe("survival study");
  });

  it("rejects invalid input without persisting", async () => {
    const deps = depsAt("2026-07-12T00:00:00.000Z");
    await expect(
      createStudy(deps, { name: "  ", strain: "S" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.studies.size).toBe(0);
  });
});

describe("updateStudy", () => {
  it("preserves createdAt, refreshes updatedAt, and applies edits", async () => {
    const created = await createStudy(depsAt("2026-01-01T00:00:00.000Z"), {
      name: "A",
      strain: "S",
      description: "notes",
    });

    const updated = await updateStudy(depsAt("2026-02-02T00:00:00.000Z"), {
      id: created.id,
      name: "B",
      strain: "S2",
      status: "active",
      description: "",
    });

    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.name).toBe("B");
    expect(updated.strain).toBe("S2");
    expect(updated.status).toBe("active");
    expect(updated.description).toBeUndefined();
  });

  it("throws NotFoundError for a missing study", async () => {
    await expect(
      updateStudy(depsAt("2026-02-02T00:00:00.000Z"), {
        id: "missing",
        name: "B",
        strain: "S",
        status: "active",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("archiveStudy", () => {
  it("archives non-destructively and stamps the time", async () => {
    const created = await createStudy(depsAt("2026-01-01T00:00:00.000Z"), {
      name: "A",
      strain: "S",
      description: "survival study",
    });

    await archiveStudy(depsAt("2026-03-03T00:00:00.000Z"), created.id);

    expect(repo.archiveCalls[0]).toEqual({
      id: created.id,
      updatedAt: "2026-03-03T00:00:00.000Z",
    });
    expect(await repo.list()).toHaveLength(0);
    const all = await repo.list({ includeArchived: true });
    expect(all).toHaveLength(1);
    // Data is preserved — only status and updatedAt change.
    expect(all[0]?.status).toBe("archived");
    expect(all[0]?.name).toBe("A");
    expect(all[0]?.strain).toBe("S");
    expect(all[0]?.description).toBe("survival study");
    expect(all[0]?.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("throws NotFoundError when the target study does not exist", async () => {
    await expect(
      archiveStudy(depsAt("2026-03-03T00:00:00.000Z"), "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
    // Nothing was recorded as changed.
    expect(repo.archiveCalls).toHaveLength(1);
    expect(await repo.list({ includeArchived: true })).toHaveLength(0);
  });
});
