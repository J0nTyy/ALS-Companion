import { afterEach, describe, expect, it, vi } from "vitest";

import type { TimelineEvent } from "@/domain/entities/timeline-event";
import { NotFoundError } from "@/application/errors";
import { SqliteTimelineEventRepository } from "@/infrastructure/repositories/sqlite-timeline-event-repository";

// A controllable fake `execute` so we can drive `rowsAffected` without SQLite.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select: vi.fn() }),
}));

const event: TimelineEvent = {
  id: "tl1",
  animalId: "an1",
  title: "Confirm SOD1 genotype",
  category: "gene_confirmation",
  status: "planned",
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
};

afterEach(() => execute.mockReset());

describe("SqliteTimelineEventRepository not-found guard", () => {
  it("update throws NotFoundError when no row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteTimelineEventRepository().update(event),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update resolves when a row was changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteTimelineEventRepository().update(event),
    ).resolves.toBeUndefined();
  });

  it("create resolves on success", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    await expect(
      new SqliteTimelineEventRepository().create(event),
    ).resolves.toBeUndefined();
  });
});
