import { afterEach, describe, expect, it, vi } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import { ConflictError, NotFoundError } from "@/application/errors";
import { SqliteAnimalRepository } from "@/infrastructure/repositories/sqlite-animal-repository";

// A controllable fake `execute` so we can drive results/errors without SQLite.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select: vi.fn() }),
}));

const animal: Animal = {
  id: "a1",
  studyId: "s1",
  animalIdentifier: "M-1",
  sex: "unknown",
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

afterEach(() => execute.mockReset());

describe("SqliteAnimalRepository", () => {
  it("update throws NotFoundError when no row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteAnimalRepository().update(animal),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update resolves when a row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteAnimalRepository().update(animal),
    ).resolves.toBeUndefined();
  });

  it("create translates a UNIQUE violation into ConflictError", async () => {
    execute.mockRejectedValue(
      new Error(
        "UNIQUE constraint failed: animals.study_id, animals.animal_identifier",
      ),
    );
    await expect(
      new SqliteAnimalRepository().create(animal),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("create resolves on success", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteAnimalRepository().create(animal),
    ).resolves.toBeUndefined();
  });
});
