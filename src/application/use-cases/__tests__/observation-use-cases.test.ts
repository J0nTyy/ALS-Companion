import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { Observation } from "@/domain/entities/observation";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { ObservationRepository } from "@/application/ports/observation-repository";
import type { ObservationUseCaseDeps } from "@/application/use-cases/deps";
import {
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import { createObservation } from "@/application/use-cases/create-observation";
import { updateObservation } from "@/application/use-cases/update-observation";

class FakeObservationRepository implements ObservationRepository {
  readonly observations = new Map<string, Observation>();

  async listByAnimal(animalId: string): Promise<Observation[]> {
    return [...this.observations.values()].filter(
      (o) => o.animalId === animalId,
    );
  }

  async getById(id: string): Promise<Observation | null> {
    return this.observations.get(id) ?? null;
  }

  async create(observation: Observation): Promise<void> {
    this.observations.set(observation.id, observation);
  }

  async update(observation: Observation): Promise<void> {
    if (!this.observations.has(observation.id)) {
      throw new NotFoundError("That observation could not be found.");
    }
    this.observations.set(observation.id, observation);
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
function study(status: Study["status"] = "active", id = "s1"): Study {
  return {
    id,
    name: "Study",
    strain: "SOD1-G93A",
    status,
    createdAt: "t",
    updatedAt: "t",
  };
}

let repo: FakeObservationRepository;

interface DepsOptions {
  now?: string;
  today?: string;
  animal?: Animal | null;
  study?: Study | null;
}

function makeDeps(options: DepsOptions = {}): ObservationUseCaseDeps {
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
    calendar: { today: () => options.today ?? now.slice(0, 10) },
    clock: { now: () => now },
    ids: { next: () => `o-${++counter}` },
  };
}

beforeEach(() => {
  repo = new FakeObservationRepository();
});

describe("createObservation", () => {
  it("records a body weight with generated id/timestamps", async () => {
    const obs = await createObservation(makeDeps(), {
      animalId: "an1",
      studyId: "s1",
      kind: "body_weight",
      observedOn: "2026-07-01",
      value: 24.5,
    });
    expect(obs.id).toBe("o-1");
    expect(obs.animalId).toBe("an1");
    expect(obs.kind).toBe("body_weight");
    expect(obs.value).toBe(24.5);
    expect(obs.scaleName).toBeUndefined();
    expect(obs.createdAt).toBe("2026-07-12T00:00:00.000Z");
    expect(obs.updatedAt).toBe(obs.createdAt);
    expect(await repo.getById("o-1")).toEqual(obs);
  });

  it("records a motor score together with its named scale", async () => {
    const obs = await createObservation(makeDeps(), {
      animalId: "an1",
      studyId: "s1",
      kind: "motor_score",
      observedOn: "2026-07-01",
      value: 3,
      scaleName: "lab motor scale",
    });
    expect(obs.scaleName).toBe("lab motor scale");
  });

  it("keeps repeated same-day measurements as separate records", async () => {
    const deps = makeDeps();
    const a = await createObservation(deps, {
      animalId: "an1",
      studyId: "s1",
      kind: "body_weight",
      observedOn: "2026-07-01",
      value: 24,
    });
    const b = await createObservation(deps, {
      animalId: "an1",
      studyId: "s1",
      kind: "body_weight",
      observedOn: "2026-07-01",
      value: 23,
    });
    expect(a.id).not.toBe(b.id);
    expect(await repo.listByAnimal("an1")).toHaveLength(2);
  });

  it("refuses a missing animal", async () => {
    await expect(
      createObservation(makeDeps({ animal: null }), {
        animalId: "an1",
        studyId: "s1",
        kind: "body_weight",
        observedOn: "2026-07-01",
        value: 24,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.observations.size).toBe(0);
  });

  it("refuses an animal that belongs to a different study", async () => {
    await expect(
      createObservation(makeDeps({ animal: animal("s1") }), {
        animalId: "an1",
        studyId: "s2",
        kind: "body_weight",
        observedOn: "2026-07-01",
        value: 24,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses writes to an archived study", async () => {
    await expect(
      createObservation(makeDeps({ study: study("archived") }), {
        animalId: "an1",
        studyId: "s1",
        kind: "body_weight",
        observedOn: "2026-07-01",
        value: 24,
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });

  it("uses the local calendar day for the future-date rule", async () => {
    const deps = makeDeps({ now: "2026-07-12T23:30:00.000Z", today: "2026-07-13" });
    const obs = await createObservation(deps, {
      animalId: "an1",
      studyId: "s1",
      kind: "body_weight",
      observedOn: "2026-07-13",
      value: 24,
    });
    expect(obs.observedOn).toBe("2026-07-13");

    await expect(
      createObservation(
        makeDeps({ now: "2026-07-12T23:30:00.000Z", today: "2026-07-13" }),
        {
          animalId: "an1",
          studyId: "s1",
          kind: "body_weight",
          observedOn: "2026-07-14",
          value: 24,
        },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("updateObservation", () => {
  it("preserves animal and createdAt, refreshes updatedAt, applies edits", async () => {
    const created = await createObservation(
      makeDeps({ now: "2026-01-01T00:00:00.000Z" }),
      {
        animalId: "an1",
        studyId: "s1",
        kind: "body_weight",
        observedOn: "2026-01-01",
        value: 24,
      },
    );
    const updated = await updateObservation(
      makeDeps({ now: "2026-02-02T00:00:00.000Z" }),
      {
        id: created.id,
        kind: "body_weight",
        observedOn: "2026-01-05",
        value: 25,
      },
    );
    expect(updated.animalId).toBe("an1");
    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.observedOn).toBe("2026-01-05");
    expect(updated.value).toBe(25);
  });

  it("throws NotFoundError for a missing observation", async () => {
    await expect(
      updateObservation(makeDeps(), {
        id: "missing",
        kind: "body_weight",
        observedOn: "2026-01-01",
        value: 24,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses edits after the study is archived", async () => {
    const created = await createObservation(makeDeps(), {
      animalId: "an1",
      studyId: "s1",
      kind: "body_weight",
      observedOn: "2026-07-01",
      value: 24,
    });
    await expect(
      updateObservation(makeDeps({ study: study("archived") }), {
        id: created.id,
        kind: "body_weight",
        observedOn: "2026-07-01",
        value: 25,
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});
