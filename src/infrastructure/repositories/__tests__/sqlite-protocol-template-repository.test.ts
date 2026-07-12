import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ProtocolStep,
  ProtocolTemplate,
} from "@/domain/entities/protocol-template";
import { NotFoundError } from "@/application/errors";
import { SqliteProtocolTemplateRepository } from "@/infrastructure/repositories/sqlite-protocol-template-repository";

// A controllable fake `execute` so we can drive `rowsAffected` without SQLite.
const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/infrastructure/db/database", () => ({
  getDatabase: () => Promise.resolve({ execute, select: vi.fn() }),
}));

const template: ProtocolTemplate = {
  id: "tpl1",
  studyId: "s1",
  name: "P",
  createdAt: "t",
  updatedAt: "t",
};

const step: ProtocolStep = {
  id: "st1",
  protocolTemplateId: "tpl1",
  title: "MRI",
  category: "mri",
  offsetDays: 0,
  displayOrder: 0,
  createdAt: "t",
  updatedAt: "t",
};

afterEach(() => execute.mockReset());

describe("SqliteProtocolTemplateRepository not-found guards", () => {
  it("updateTemplate throws NotFoundError when no row changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteProtocolTemplateRepository().updateTemplate(template),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updateStep throws NotFoundError when no row changed", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteProtocolTemplateRepository().updateStep(step),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleteStep throws NotFoundError when no row deleted", async () => {
    execute.mockResolvedValue({ rowsAffected: 0 });
    await expect(
      new SqliteProtocolTemplateRepository().deleteStep("missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("createStep and successful updates resolve", async () => {
    execute.mockResolvedValue({ rowsAffected: 1 });
    const repo = new SqliteProtocolTemplateRepository();
    await expect(repo.createStep(step)).resolves.toBeUndefined();
    await expect(repo.updateStep(step)).resolves.toBeUndefined();
    await expect(repo.deleteStep("st1")).resolves.toBeUndefined();
  });
});
