import { describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { ProtocolStep } from "@/domain/entities/protocol-template";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { AnimalRepository } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventRepository } from "@/application/ports/timeline-event-repository";
import type { ProtocolTemplateReader } from "@/application/ports/protocol-template-repository";
import type { AnimalCreationDeps } from "@/application/use-cases/deps";
import { applyProtocolToAnimal } from "@/application/use-cases/apply-protocol-to-animal";

const animal: Animal = {
  id: "an1",
  studyId: "s1",
  animalIdentifier: "M-1",
  sex: "unknown",
  createdAt: "2026-07-13T09:00:00.000Z",
  updatedAt: "2026-07-13T09:00:00.000Z",
};

class FakeAnimalRepo implements AnimalRepository {
  constructor(private readonly known: Animal) {}
  async listByStudy(): Promise<Animal[]> {
    return [this.known];
  }
  async getById(id: string): Promise<Animal | null> {
    return id === this.known.id ? this.known : null;
  }
  async findByIdentifier(): Promise<Animal | null> {
    return null;
  }
  async create(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

class FakeTimelineRepo implements TimelineEventRepository {
  readonly events: TimelineEvent[] = [];
  async listByAnimal(animalId: string): Promise<TimelineEvent[]> {
    return this.events.filter((e) => e.animalId === animalId);
  }
  async getById(id: string): Promise<TimelineEvent | null> {
    return this.events.find((e) => e.id === id) ?? null;
  }
  async create(event: TimelineEvent): Promise<void> {
    this.events.push(event);
  }
  async update(): Promise<void> {}
  async delete(id: string): Promise<void> {
    const i = this.events.findIndex((e) => e.id === id);
    if (i >= 0) this.events.splice(i, 1);
  }
}

const activeStudy: StudyReader = {
  async getById(id: string): Promise<Study | null> {
    return {
      id,
      name: "S",
      strain: "X",
      status: "active",
      createdAt: "t",
      updatedAt: "t",
    };
  },
};

function step(
  id: string,
  title: string,
  offsetDays: number,
  order: number,
  notes?: string,
): ProtocolStep {
  return {
    id,
    protocolTemplateId: "tpl1",
    title,
    category: "mri",
    offsetDays,
    displayOrder: order,
    createdAt: "t",
    updatedAt: "t",
    ...(notes !== undefined ? { notes } : {}),
  };
}

function makeDeps(
  steps: ProtocolStep[],
  timeline: FakeTimelineRepo,
  target: Animal = animal,
): AnimalCreationDeps {
  let counter = 0;
  const protocols: ProtocolTemplateReader = {
    async listStepsByStudy(): Promise<ProtocolStep[]> {
      return steps;
    },
  };
  return {
    repository: new FakeAnimalRepo(target),
    studies: activeStudy,
    protocols,
    timelineEvents: timeline,
    calendar: { today: () => "2026-07-13" },
    clock: { now: () => "2026-07-13T09:00:00.000Z" },
    ids: { next: () => `tl-${++counter}` },
  };
}

describe("applyProtocolToAnimal", () => {
  it("generates one planned timeline event per step, dated by offset", async () => {
    const timeline = new FakeTimelineRepo();
    const steps = [
      step("s-a", "Gene check", 0, 0, "confirm genotype"),
      step("s-b", "Baseline MRI", 30, 1),
      step("s-c", "Histology", 60, 2),
    ];
    await applyProtocolToAnimal(makeDeps(steps, timeline), animal);

    const events = await timeline.listByAnimal("an1");
    expect(events).toHaveLength(3);

    // Order preserved, planned status, dates = 2026-07-13 + offsetDays.
    expect(events.map((e) => e.title)).toEqual([
      "Gene check",
      "Baseline MRI",
      "Histology",
    ]);
    expect(events.every((e) => e.status === "planned")).toBe(true);
    expect(events.map((e) => e.plannedDate)).toEqual([
      "2026-07-13",
      "2026-08-12",
      "2026-09-11",
    ]);
    expect(events[0]?.notes).toBe("confirm genotype");
    expect(events[1]?.notes).toBeUndefined();
    expect(events.every((e) => e.animalId === "an1")).toBe(true);
  });

  it("does nothing when the study has no protocol steps", async () => {
    const timeline = new FakeTimelineRepo();
    await applyProtocolToAnimal(makeDeps([], timeline), animal);
    expect(timeline.events).toHaveLength(0);
  });

  it("only seeds the animal it's called for (editing the protocol later doesn't touch earlier animals)", async () => {
    const timeline = new FakeTimelineRepo();
    // First animal seeded from a 1-step protocol.
    await applyProtocolToAnimal(
      makeDeps([step("s-a", "A", 0, 0)], timeline),
      animal,
    );
    expect(timeline.events.filter((e) => e.animalId === "an1")).toHaveLength(1);

    // Protocol later gains a step; a *different* animal is seeded.
    const animal2: Animal = { ...animal, id: "an2", animalIdentifier: "M-2" };
    const timeline2 = new FakeTimelineRepo();
    await applyProtocolToAnimal(
      makeDeps(
        [step("s-a", "A", 0, 0), step("s-b", "B", 7, 1)],
        timeline2,
        animal2,
      ),
      animal2,
    );
    // The earlier animal's timeline is untouched (still 1 event).
    expect(timeline.events.filter((e) => e.animalId === "an1")).toHaveLength(1);
    expect(timeline2.events.filter((e) => e.animalId === "an2")).toHaveLength(2);
  });
});
