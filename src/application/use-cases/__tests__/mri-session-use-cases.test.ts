import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { MRISession } from "@/domain/entities/mri-session";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import type { MRISessionRepository } from "@/application/ports/mri-session-repository";
import type { MriSessionUseCaseDeps } from "@/application/use-cases/deps";
import { NotFoundError, StudyArchivedError } from "@/application/errors";
import { createMriSession } from "@/application/use-cases/create-mri-session";
import { updateMriSession } from "@/application/use-cases/update-mri-session";

class FakeMriSessionRepository implements MRISessionRepository {
  readonly sessions = new Map<string, MRISession>();
  async listByTimelineEvent(timelineEventId: string): Promise<MRISession[]> {
    return [...this.sessions.values()].filter(
      (s) => s.timelineEventId === timelineEventId,
    );
  }
  async getById(id: string): Promise<MRISession | null> {
    return this.sessions.get(id) ?? null;
  }
  async create(session: MRISession): Promise<void> {
    this.sessions.set(session.id, session);
  }
  async update(session: MRISession): Promise<void> {
    if (!this.sessions.has(session.id)) {
      throw new NotFoundError("That MRI session could not be found.");
    }
    this.sessions.set(session.id, session);
  }
}

const timelineEvent: TimelineEvent = {
  id: "tl1",
  animalId: "an1",
  title: "MRI scan",
  category: "mri",
  status: "planned",
  createdAt: "t",
  updatedAt: "t",
};

function timelineReader(event: TimelineEvent | null): TimelineEventReader {
  return { async getById() { return event; } };
}
function animalReader(animal: Animal | null): AnimalReader {
  return { async getById() { return animal; } };
}
function studyReader(study: Study | null): StudyReader {
  return { async getById() { return study; } };
}
function animal(): Animal {
  return {
    id: "an1",
    studyId: "s1",
    animalIdentifier: "M-1",
    sex: "unknown",
    createdAt: "t",
    updatedAt: "t",
  };
}
function study(status: Study["status"] = "active"): Study {
  return {
    id: "s1",
    name: "S",
    strain: "X",
    status,
    createdAt: "t",
    updatedAt: "t",
  };
}

let repo: FakeMriSessionRepository;

interface DepsOptions {
  now?: string;
  event?: TimelineEvent | null;
  animal?: Animal | null;
  study?: Study | null;
}

function makeDeps(options: DepsOptions = {}): MriSessionUseCaseDeps {
  let counter = 0;
  const now = options.now ?? "2026-07-13T00:00:00.000Z";
  return {
    repository: repo,
    timelineEvents: timelineReader(
      options.event !== undefined ? options.event : timelineEvent,
    ),
    animals: animalReader(
      options.animal !== undefined ? options.animal : animal(),
    ),
    studies: studyReader(options.study !== undefined ? options.study : study()),
    clock: { now: () => now },
    ids: { next: () => `mri-${++counter}` },
  };
}

beforeEach(() => {
  repo = new FakeMriSessionRepository();
});

describe("createMriSession", () => {
  it("creates a session with generated id/timestamps and normalized fields", async () => {
    const session = await createMriSession(makeDeps(), {
      timelineEventId: "tl1",
      title: "  Baseline MRI ",
      modality: "mri",
      acquisitionDate: "2026-07-10",
      anatomicalRegion: "  Brain ",
    });
    expect(session.id).toBe("mri-1");
    expect(session.timelineEventId).toBe("tl1");
    expect(session.title).toBe("Baseline MRI");
    expect(session.modality).toBe("mri");
    expect(session.acquisitionDate).toBe("2026-07-10");
    expect(session.anatomicalRegion).toBe("Brain");
    expect(session.operator).toBeUndefined();
    expect(session.createdAt).toBe("2026-07-13T00:00:00.000Z");
    expect(await repo.getById("mri-1")).toEqual(session);
  });

  it("refuses when the timeline event does not exist", async () => {
    await expect(
      createMriSession(makeDeps({ event: null }), {
        timelineEventId: "tl1",
        title: "x",
        modality: "mri",
        acquisitionDate: "2026-07-10",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.sessions.size).toBe(0);
  });

  it("refuses when the parent animal is missing", async () => {
    await expect(
      createMriSession(makeDeps({ animal: null }), {
        timelineEventId: "tl1",
        title: "x",
        modality: "mri",
        acquisitionDate: "2026-07-10",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses when the study is archived", async () => {
    await expect(
      createMriSession(makeDeps({ study: study("archived") }), {
        timelineEventId: "tl1",
        title: "x",
        modality: "mri",
        acquisitionDate: "2026-07-10",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("updateMriSession", () => {
  it("preserves timeline event and createdAt, refreshes updatedAt", async () => {
    const created = await createMriSession(
      makeDeps({ now: "2026-01-01T00:00:00.000Z" }),
      {
        timelineEventId: "tl1",
        title: "Baseline MRI",
        modality: "mri",
        acquisitionDate: "2026-01-01",
        operator: "Sam",
      },
    );
    const updated = await updateMriSession(
      makeDeps({ now: "2026-02-02T00:00:00.000Z" }),
      {
        id: created.id,
        title: "Follow-up MRI",
        modality: "mri",
        acquisitionDate: "2026-02-01",
      },
    );
    expect(updated.timelineEventId).toBe("tl1");
    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.title).toBe("Follow-up MRI");
    // Clearing the operator (not supplied) removes it.
    expect(updated.operator).toBeUndefined();
  });

  it("throws NotFoundError for a missing session", async () => {
    await expect(
      updateMriSession(makeDeps(), {
        id: "missing",
        title: "x",
        modality: "mri",
        acquisitionDate: "2026-07-10",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses edits after the study is archived", async () => {
    const created = await createMriSession(makeDeps(), {
      timelineEventId: "tl1",
      title: "x",
      modality: "mri",
      acquisitionDate: "2026-07-10",
    });
    await expect(
      updateMriSession(makeDeps({ study: study("archived") }), {
        id: created.id,
        title: "y",
        modality: "mri",
        acquisitionDate: "2026-07-10",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});
