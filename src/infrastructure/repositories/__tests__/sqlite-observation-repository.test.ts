import { afterEach, describe, expect, it, vi } from "vitest";

import type { Observation } from "@/domain/entities/observation";
import { NotFoundError } from "@/application/errors";
import { SqliteObservationRepository } from "@/infrastructure/repositories/sqlite-observation-repository";

// A controllable fake `execute` so we can drive `rowsAffected` without SQLite.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select: vi.fn() }),
}));

const observation: Observation = {
  id: "o1",
  animalId: "an1",
  observedOn: "2026-07-01",
  kind: "body_weight",
  value: 24.5,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

afterEach(() => execute.mockReset());

describe("SqliteObservationRepository not-found guard", () => {
  it("update throws NotFoundError when no row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteObservationRepository().update(observation),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update resolves when a row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteObservationRepository().update(observation),
    ).resolves.toBeUndefined();
  });

  it("create resolves on success", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteObservationRepository().create(observation),
    ).resolves.toBeUndefined();
  });
});
