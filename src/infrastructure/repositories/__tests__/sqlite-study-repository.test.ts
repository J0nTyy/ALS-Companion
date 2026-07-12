import { afterEach, describe, expect, it, vi } from "vitest";

import type { Study } from "@/domain/entities/study";
import { NotFoundError } from "@/application/errors";
import { SqliteStudyRepository } from "@/infrastructure/repositories/sqlite-study-repository";

// A controllable fake `execute` so we can drive `rowsAffected` without SQLite.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select: vi.fn() }),
}));

const study: Study = {
  id: "1",
  name: "Cohort A",
  strain: "SOD1-G93A",
  status: "planning",
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

afterEach(() => execute.mockReset());

describe("SqliteStudyRepository not-found guard", () => {
  it("update throws NotFoundError when no row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteStudyRepository().update(study),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update resolves when a row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteStudyRepository().update(study),
    ).resolves.toBeUndefined();
  });

  it("archive throws NotFoundError when no row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteStudyRepository().archive("missing", study.updatedAt),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("archive resolves when a row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteStudyRepository().archive("1", study.updatedAt),
    ).resolves.toBeUndefined();
  });
});
