import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventRepository } from "@/application/ports/timeline-event-repository";
import type { TimelineEventUseCaseDeps } from "@/application/use-cases/deps";
import { NotFoundError, StudyArchivedError } from "@/application/errors";
import { createTimelineEvent } from "@/application/use-cases/create-timeline-event";
import { updateTimelineEvent } from "@/application/use-cases/update-timeline-event";

class FakeTimelineEventRepository implements TimelineEventRepository {
  readonly events = new Map<string, TimelineEvent>();

  async listByAnimal(animalId: string): Promise<TimelineEvent[]> {
    return [...this.events.values()].filter((e) => e.animalId === animalId);
  }
  async getById(id: string): Promise<TimelineEvent | null> {
    return this.events.get(id) ?? null;
  }
  async create(event: TimelineEvent): Promise<void> {
    this.events.set(event.id, event);
  }
  async update(event: TimelineEvent): Promise<void> {
    if (!this.events.has(event.id)) {
      throw new NotFoundError("That timeline event could not be found.");
    }
    this.events.set(event.id, event);
  }
  async delete(id: string): Promise<void> {
    this.events.delete(id);
  }
}

function animalReader(animal: Animal | null): AnimalReader {
  return { async getById() { return animal; } };
}
function studyReader(study: Study | null): StudyReader {
  return { async getById() { return study; } };
}
function animal(studyId = "s1"): Animal {
  return {
    id: "an1",
    studyId,
    animalIdentifier: "M-1",
    sex: "unknown",
    createdAt: "t",
    updatedAt: "t",
  };
}
function study(status: Study["status"] = "active"): Study {
  return {
    id: "s1",
    name: "Study",
    strain: "SOD1-G93A",
    status,
    createdAt: "t",
    updatedAt: "t",
  };
}

let repo: FakeTimelineEventRepository;

interface DepsOptions {
  now?: string;
  animal?: Animal | null;
  study?: Study | null;
}

function makeDeps(options: DepsOptions = {}): TimelineEventUseCaseDeps {
  let counter = 0;
  const now = options.now ?? "2026-07-12T00:00:00.000Z";
  return {
    repository: repo,
    animals: animalReader(
      options.animal !== undefined ? options.animal : animal(),
    ),
    studies: studyReader(
      options.study !== undefined ? options.study : study(),
    ),
    clock: { now: () => now },
    ids: { next: () => `tl-${++counter}` },
  };
}

beforeEach(() => {
  repo = new FakeTimelineEventRepository();
});

describe("createTimelineEvent", () => {
  it("creates an event with generated id/timestamps", async () => {
    const event = await createTimelineEvent(makeDeps(), {
      animalId: "an1",
      studyId: "s1",
      title: "  Confirm genotype ",
      category: "gene_confirmation",
      status: "planned",
    });
    expect(event.id).toBe("tl-1");
    expect(event.animalId).toBe("an1");
    expect(event.title).toBe("Confirm genotype");
    expect(event.category).toBe("gene_confirmation");
    expect(event.status).toBe("planned");
    expect(event.createdAt).toBe("2026-07-12T00:00:00.000Z");
    expect(event.updatedAt).toBe(event.createdAt);
    expect(await repo.getById("tl-1")).toEqual(event);
  });

  it("accepts a future planned date", async () => {
    const event = await createTimelineEvent(makeDeps(), {
      animalId: "an1",
      studyId: "s1",
      title: "MRI scan",
      category: "mri",
      status: "planned",
      plannedDate: "2999-01-01",
    });
    expect(event.plannedDate).toBe("2999-01-01");
  });

  it("refuses a missing animal", async () => {
    await expect(
      createTimelineEvent(makeDeps({ animal: null }), {
        animalId: "an1",
        studyId: "s1",
        title: "x",
        category: "mri",
        status: "planned",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.events.size).toBe(0);
  });

  it("refuses an animal that belongs to a different study", async () => {
    await expect(
      createTimelineEvent(makeDeps({ animal: animal("s1") }), {
        animalId: "an1",
        studyId: "s2",
        title: "x",
        category: "mri",
        status: "planned",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses writes to an archived study", async () => {
    await expect(
      createTimelineEvent(makeDeps({ study: study("archived") }), {
        animalId: "an1",
        studyId: "s1",
        title: "x",
        category: "mri",
        status: "planned",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("updateTimelineEvent", () => {
  it("preserves animal and createdAt, refreshes updatedAt, applies edits", async () => {
    const created = await createTimelineEvent(
      makeDeps({ now: "2026-01-01T00:00:00.000Z" }),
      {
        animalId: "an1",
        studyId: "s1",
        title: "Behavior test",
        category: "behavioral_assessment",
        status: "planned",
        plannedDate: "2026-02-01",
      },
    );

    const updated = await updateTimelineEvent(
      makeDeps({ now: "2026-02-02T00:00:00.000Z" }),
      {
        id: created.id,
        title: "Behavior test",
        category: "behavioral_assessment",
        status: "completed",
        completedDate: "2026-02-02",
      },
    );

    expect(updated.animalId).toBe("an1");
    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.status).toBe("completed");
    expect(updated.completedDate).toBe("2026-02-02");
    // Clearing the planned date (not supplied) removes it.
    expect(updated.plannedDate).toBeUndefined();
  });

  it("throws NotFoundError for a missing event", async () => {
    await expect(
      updateTimelineEvent(makeDeps(), {
        id: "missing",
        title: "x",
        category: "mri",
        status: "planned",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses edits after the study is archived", async () => {
    const created = await createTimelineEvent(makeDeps(), {
      animalId: "an1",
      studyId: "s1",
      title: "x",
      category: "mri",
      status: "planned",
    });
    await expect(
      updateTimelineEvent(makeDeps({ study: study("archived") }), {
        id: created.id,
        title: "x",
        category: "mri",
        status: "completed",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});
