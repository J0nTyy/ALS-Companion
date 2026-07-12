import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { AnimalRepository } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { AnimalUseCaseDeps } from "@/application/use-cases/deps";
import {
  ConflictError,
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import { createAnimal } from "@/application/use-cases/create-animal";
import { updateAnimal } from "@/application/use-cases/update-animal";

/** In-memory repository honoring the port contract (unique within a study). */
class FakeAnimalRepository implements AnimalRepository {
  readonly animals = new Map<string, Animal>();

  async listByStudy(studyId: string): Promise<Animal[]> {
    return [...this.animals.values()].filter((a) => a.studyId === studyId);
  }

  async getById(id: string): Promise<Animal | null> {
    return this.animals.get(id) ?? null;
  }

  async findByIdentifier(
    studyId: string,
    animalIdentifier: string,
  ): Promise<Animal | null> {
    return (
      [...this.animals.values()].find(
        (a) => a.studyId === studyId && a.animalIdentifier === animalIdentifier,
      ) ?? null
    );
  }

  async create(animal: Animal): Promise<void> {
    if (await this.findByIdentifier(animal.studyId, animal.animalIdentifier)) {
      throw new ConflictError(
        "An animal with this ID already exists in this study.",
        "animalIdentifier",
      );
    }
    this.animals.set(animal.id, animal);
  }

  async update(animal: Animal): Promise<void> {
    if (!this.animals.has(animal.id)) {
      throw new NotFoundError("That animal could not be found.");
    }
    this.animals.set(animal.id, animal);
  }
}

let repo: FakeAnimalRepository;

function studyWith(id: string, status: Study["status"]): Study {
  return {
    id,
    name: "Study",
    strain: "SOD1-G93A",
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

/** Study reader that reports an active study for any id unless overridden. */
function makeStudies(overrides: Record<string, Study | null> = {}): StudyReader {
  return {
    async getById(id: string): Promise<Study | null> {
      if (Object.prototype.hasOwnProperty.call(overrides, id)) {
        return overrides[id] ?? null;
      }
      return studyWith(id, "active");
    },
  };
}

interface DepsOptions {
  /** Local calendar "today" (YYYY-MM-DD); defaults to the clock's UTC date. */
  today?: string;
  studies?: StudyReader;
}

function depsAt(now: string, options: DepsOptions = {}): AnimalUseCaseDeps {
  let counter = 0;
  return {
    repository: repo,
    studies: options.studies ?? makeStudies(),
    calendar: { today: () => options.today ?? now.slice(0, 10) },
    clock: { now: () => now },
    ids: { next: () => `a-${++counter}` },
  };
}

beforeEach(() => {
  repo = new FakeAnimalRepository();
});

describe("createAnimal", () => {
  it("generates id/timestamps, normalizes fields, and persists", async () => {
    const animal = await createAnimal(depsAt("2026-07-12T00:00:00.000Z"), {
      studyId: "s1",
      animalIdentifier: "  M-014 ",
      treatmentGroup: "  Riluzole ",
    });

    expect(animal.id).toBe("a-1");
    expect(animal.studyId).toBe("s1");
    expect(animal.animalIdentifier).toBe("M-014");
    expect(animal.sex).toBe("unknown");
    expect(animal.treatmentGroup).toBe("Riluzole");
    expect(animal.dateOfBirth).toBeUndefined();
    expect(animal.createdAt).toBe("2026-07-12T00:00:00.000Z");
    expect(animal.updatedAt).toBe(animal.createdAt);
    expect(await repo.getById("a-1")).toEqual(animal);
  });

  it("rejects a duplicate identifier within the same study", async () => {
    const deps = depsAt("2026-07-12T00:00:00.000Z");
    await createAnimal(deps, { studyId: "s1", animalIdentifier: "M-1" });
    await expect(
      createAnimal(deps, { studyId: "s1", animalIdentifier: "M-1" }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(await repo.listByStudy("s1")).toHaveLength(1);
  });

  it("allows the same identifier in a different study", async () => {
    const deps = depsAt("2026-07-12T00:00:00.000Z");
    await createAnimal(deps, { studyId: "s1", animalIdentifier: "M-1" });
    const other = await createAnimal(deps, {
      studyId: "s2",
      animalIdentifier: "M-1",
    });
    expect(other.studyId).toBe("s2");
    expect(await repo.listByStudy("s2")).toHaveLength(1);
  });
});

describe("updateAnimal", () => {
  it("preserves study and createdAt, refreshes updatedAt, applies edits", async () => {
    const created = await createAnimal(depsAt("2026-01-01T00:00:00.000Z"), {
      studyId: "s1",
      animalIdentifier: "M-1",
      mutation: "SOD1-G93A",
    });

    const updated = await updateAnimal(depsAt("2026-02-02T00:00:00.000Z"), {
      id: created.id,
      animalIdentifier: "M-2",
      sex: "female",
      mutation: "",
      treatmentGroup: "Control",
    });

    expect(updated.studyId).toBe("s1");
    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.animalIdentifier).toBe("M-2");
    expect(updated.sex).toBe("female");
    expect(updated.mutation).toBeUndefined();
    expect(updated.treatmentGroup).toBe("Control");
  });

  it("allows saving an animal without changing its own identifier", async () => {
    const created = await createAnimal(depsAt("2026-01-01T00:00:00.000Z"), {
      studyId: "s1",
      animalIdentifier: "M-1",
    });
    const updated = await updateAnimal(depsAt("2026-02-02T00:00:00.000Z"), {
      id: created.id,
      animalIdentifier: "M-1",
      sex: "male",
    });
    expect(updated.sex).toBe("male");
  });

  it("rejects renaming onto another animal's identifier in the study", async () => {
    const deps = depsAt("2026-01-01T00:00:00.000Z");
    await createAnimal(deps, { studyId: "s1", animalIdentifier: "M-1" });
    const b = await createAnimal(deps, { studyId: "s1", animalIdentifier: "M-2" });

    await expect(
      updateAnimal(depsAt("2026-02-02T00:00:00.000Z"), {
        id: b.id,
        animalIdentifier: "M-1",
        sex: "unknown",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws NotFoundError for a missing animal", async () => {
    await expect(
      updateAnimal(depsAt("2026-02-02T00:00:00.000Z"), {
        id: "missing",
        animalIdentifier: "M-9",
        sex: "unknown",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("parent-study integrity", () => {
  it("refuses to create an animal for a missing study", async () => {
    const deps = depsAt("2026-07-12T00:00:00.000Z", {
      studies: makeStudies({ s1: null }),
    });
    await expect(
      createAnimal(deps, { studyId: "s1", animalIdentifier: "M-1" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await repo.listByStudy("s1")).toHaveLength(0);
  });

  it("refuses to create an animal in an archived study", async () => {
    const deps = depsAt("2026-07-12T00:00:00.000Z", {
      studies: makeStudies({ s1: studyWith("s1", "archived") }),
    });
    await expect(
      createAnimal(deps, { studyId: "s1", animalIdentifier: "M-1" }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
    expect(await repo.listByStudy("s1")).toHaveLength(0);
  });

  it("refuses to edit an animal after its study is archived (race)", async () => {
    // Created while the study was active…
    const created = await createAnimal(depsAt("2026-01-01T00:00:00.000Z"), {
      studyId: "s1",
      animalIdentifier: "M-1",
    });
    // …then the study is archived before the edit lands.
    await expect(
      updateAnimal(
        depsAt("2026-02-02T00:00:00.000Z", {
          studies: makeStudies({ s1: studyWith("s1", "archived") }),
        }),
        { id: created.id, animalIdentifier: "M-1", sex: "female" },
      ),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("local-day date-of-birth validation", () => {
  it("accepts the researcher's local current day even when UTC is the day before", async () => {
    // Clock is a late-evening UTC instant; the local day is already tomorrow.
    // `deps.clock.now().slice(0,10)` would be "2026-07-12" and reject this DOB —
    // using the injected local calendar ("2026-07-13") accepts it.
    const deps = depsAt("2026-07-12T23:30:00.000Z", { today: "2026-07-13" });
    const animal = await createAnimal(deps, {
      studyId: "s1",
      animalIdentifier: "M-1",
      dateOfBirth: "2026-07-13",
    });
    expect(animal.dateOfBirth).toBe("2026-07-13");
  });

  it("still rejects a date after the local current day", async () => {
    const deps = depsAt("2026-07-12T23:30:00.000Z", { today: "2026-07-13" });
    await expect(
      createAnimal(deps, {
        studyId: "s1",
        animalIdentifier: "M-2",
        dateOfBirth: "2026-07-14",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
