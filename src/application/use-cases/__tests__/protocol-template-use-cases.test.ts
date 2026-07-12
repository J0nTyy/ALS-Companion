import { beforeEach, describe, expect, it } from "vitest";

import type { Study } from "@/domain/entities/study";
import type {
  ProtocolStep,
  ProtocolTemplate,
} from "@/domain/entities/protocol-template";
import type { ProtocolTemplateRepository } from "@/application/ports/protocol-template-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { ProtocolTemplateUseCaseDeps } from "@/application/use-cases/deps";
import {
  ConflictError,
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import {
  addProtocolStep,
  createProtocol,
  getProtocol,
  removeProtocolStep,
  reorderProtocolSteps,
  updateProtocol,
  updateProtocolStep,
} from "@/application/use-cases/protocol-template-use-cases";

class FakeProtocolTemplateRepository implements ProtocolTemplateRepository {
  readonly templates = new Map<string, ProtocolTemplate>();
  readonly steps = new Map<string, ProtocolStep>();

  async findByStudy(studyId: string): Promise<ProtocolTemplate | null> {
    return (
      [...this.templates.values()].find((t) => t.studyId === studyId) ?? null
    );
  }
  async getTemplateById(id: string): Promise<ProtocolTemplate | null> {
    return this.templates.get(id) ?? null;
  }
  async createTemplate(template: ProtocolTemplate): Promise<void> {
    this.templates.set(template.id, template);
  }
  async updateTemplate(template: ProtocolTemplate): Promise<void> {
    if (!this.templates.has(template.id)) {
      throw new NotFoundError("That protocol could not be found.");
    }
    this.templates.set(template.id, template);
  }
  async listStepsByTemplate(templateId: string): Promise<ProtocolStep[]> {
    return [...this.steps.values()]
      .filter((s) => s.protocolTemplateId === templateId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
  async listStepsByStudy(studyId: string): Promise<ProtocolStep[]> {
    const template = await this.findByStudy(studyId);
    return template ? this.listStepsByTemplate(template.id) : [];
  }
  async getStepById(id: string): Promise<ProtocolStep | null> {
    return this.steps.get(id) ?? null;
  }
  async createStep(step: ProtocolStep): Promise<void> {
    this.steps.set(step.id, step);
  }
  async updateStep(step: ProtocolStep): Promise<void> {
    if (!this.steps.has(step.id)) {
      throw new NotFoundError("That protocol step could not be found.");
    }
    this.steps.set(step.id, step);
  }
  async deleteStep(id: string): Promise<void> {
    if (!this.steps.has(id)) {
      throw new NotFoundError("That protocol step could not be found.");
    }
    this.steps.delete(id);
  }
  async reorderSteps(
    templateId: string,
    orderedStepIds: readonly string[],
    updatedAt: string,
  ): Promise<void> {
    orderedStepIds.forEach((id, index) => {
      const step = this.steps.get(id);
      if (step && step.protocolTemplateId === templateId) {
        this.steps.set(id, { ...step, displayOrder: index, updatedAt });
      }
    });
  }
}

function studyReader(status: Study["status"] = "active"): StudyReader {
  return {
    async getById(id: string): Promise<Study | null> {
      return {
        id,
        name: "S",
        strain: "X",
        status,
        createdAt: "t",
        updatedAt: "t",
      };
    },
  };
}

let repo: FakeProtocolTemplateRepository;
let idCounter = 0;

function makeDeps(status: Study["status"] = "active"): ProtocolTemplateUseCaseDeps {
  return {
    repository: repo,
    studies: studyReader(status),
    clock: { now: () => "2026-07-13T00:00:00.000Z" },
    // Module-level counter so ids stay unique across multiple makeDeps() calls
    // within a single test.
    ids: { next: () => `p-${++idCounter}` },
  };
}

beforeEach(() => {
  repo = new FakeProtocolTemplateRepository();
  idCounter = 0;
});

describe("createProtocol / updateProtocol", () => {
  it("creates one protocol per study and rejects a second", async () => {
    const created = await createProtocol(makeDeps(), {
      studyId: "s1",
      name: "  My protocol ",
    });
    expect(created.name).toBe("My protocol");
    expect(created.studyId).toBe("s1");
    await expect(
      createProtocol(makeDeps(), { studyId: "s1", name: "Another" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("refuses to create a protocol for an archived study", async () => {
    await expect(
      createProtocol(makeDeps("archived"), { studyId: "s1", name: "P" }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });

  it("renames a protocol and rejects missing / archived", async () => {
    const created = await createProtocol(makeDeps(), {
      studyId: "s1",
      name: "P",
    });
    const renamed = await updateProtocol(makeDeps(), {
      id: created.id,
      name: "Renamed",
    });
    expect(renamed.name).toBe("Renamed");
    await expect(
      updateProtocol(makeDeps(), { id: "missing", name: "x" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("protocol steps", () => {
  async function seedTemplate(): Promise<ProtocolTemplate> {
    return createProtocol(makeDeps(), { studyId: "s1", name: "P" });
  }

  it("appends steps with increasing display order", async () => {
    const t = await seedTemplate();
    const a = await addProtocolStep(makeDeps(), {
      protocolTemplateId: t.id,
      title: "Gene check",
      category: "gene_confirmation",
      offsetDays: 0,
    });
    const b = await addProtocolStep(makeDeps(), {
      protocolTemplateId: t.id,
      title: "MRI",
      category: "mri",
      offsetDays: 30,
    });
    expect(a.displayOrder).toBe(0);
    expect(b.displayOrder).toBe(1);

    const protocol = await getProtocol(makeDeps(), "s1");
    expect(protocol?.steps.map((s) => s.title)).toEqual(["Gene check", "MRI"]);
  });

  it("edits a step and removes a step without touching others", async () => {
    const t = await seedTemplate();
    const a = await addProtocolStep(makeDeps(), {
      protocolTemplateId: t.id,
      title: "A",
      category: "mri",
      offsetDays: 0,
    });
    const b = await addProtocolStep(makeDeps(), {
      protocolTemplateId: t.id,
      title: "B",
      category: "mri",
      offsetDays: 7,
    });

    const editedA = await updateProtocolStep(makeDeps(), {
      id: a.id,
      title: "A2",
      category: "histopathology",
      offsetDays: 3,
    });
    expect(editedA.title).toBe("A2");
    expect(editedA.category).toBe("histopathology");
    expect(editedA.offsetDays).toBe(3);

    await removeProtocolStep(makeDeps(), b.id);
    const protocol = await getProtocol(makeDeps(), "s1");
    expect(protocol?.steps.map((s) => s.id)).toEqual([a.id]);

    await expect(
      updateProtocolStep(makeDeps(), {
        id: "missing",
        title: "x",
        category: "mri",
        offsetDays: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      removeProtocolStep(makeDeps(), "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("reorders steps and rejects a mismatched id set", async () => {
    const t = await seedTemplate();
    const a = await addProtocolStep(makeDeps(), {
      protocolTemplateId: t.id,
      title: "A",
      category: "mri",
      offsetDays: 0,
    });
    const b = await addProtocolStep(makeDeps(), {
      protocolTemplateId: t.id,
      title: "B",
      category: "mri",
      offsetDays: 7,
    });

    const reordered = await reorderProtocolSteps(makeDeps(), {
      templateId: t.id,
      orderedStepIds: [b.id, a.id],
    });
    expect(reordered.map((s) => s.title)).toEqual(["B", "A"]);

    await expect(
      reorderProtocolSteps(makeDeps(), {
        templateId: t.id,
        orderedStepIds: [a.id],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses step edits when the study is archived", async () => {
    const t = await seedTemplate();
    const a = await addProtocolStep(makeDeps(), {
      protocolTemplateId: t.id,
      title: "A",
      category: "mri",
      offsetDays: 0,
    });
    await expect(
      addProtocolStep(makeDeps("archived"), {
        protocolTemplateId: t.id,
        title: "B",
        category: "mri",
        offsetDays: 0,
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
    await expect(
      removeProtocolStep(makeDeps("archived"), a.id),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("getProtocol", () => {
  it("returns null when a study has no protocol", async () => {
    expect(await getProtocol(makeDeps(), "s1")).toBeNull();
  });
});
