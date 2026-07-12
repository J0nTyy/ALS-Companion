import { afterEach, describe, expect, it, vi } from "vitest";

import type { MRISession } from "@/domain/entities/mri-session";
import { NotFoundError } from "@/application/errors";
import { SqliteMriSessionRepository } from "@/infrastructure/repositories/sqlite-mri-session-repository";

// A controllable fake `execute` so we can drive `rowsAffected` without SQLite.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select: vi.fn() }),
}));

const session: MRISession = {
  id: "mri1",
  timelineEventId: "tl1",
  title: "Baseline MRI",
  modality: "mri",
  acquisitionDate: "2026-07-10",
  createdAt: "t",
  updatedAt: "t",
};

afterEach(() => execute.mockReset());

describe("SqliteMriSessionRepository not-found guard", () => {
  it("update throws NotFoundError when no row changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteMriSessionRepository().update(session),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update resolves when a row changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteMriSessionRepository().update(session),
    ).resolves.toBeUndefined();
  });

  it("create resolves on success", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteMriSessionRepository().create(session),
    ).resolves.toBeUndefined();
  });
});
