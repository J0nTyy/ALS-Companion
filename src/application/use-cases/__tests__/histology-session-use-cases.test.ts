import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { HistologySession } from "@/domain/entities/histology-session";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import type { HistologySessionRepository } from "@/application/ports/histology-session-repository";
import type { HistologySessionUseCaseDeps } from "@/application/use-cases/deps";
import {
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import { createHistologySession } from "@/application/use-cases/create-histology-session";
import { updateHistologySession } from "@/application/use-cases/update-histology-session";
import { listHistologySessions } from "@/application/use-cases/list-histology-sessions";

class FakeHistologySessionRepository implements HistologySessionRepository {
  readonly sessions = new Map<string, HistologySession>();
  async listByTimelineEvent(
    timelineEventId: string,
  ): Promise<HistologySession[]> {
    return [...this.sessions.values()].filter(
      (s) => s.timelineEventId === timelineEventId,
    );
  }
  async getById(id: string): Promise<HistologySession | null> {
    return this.sessions.get(id) ?? null;
  }
  async create(session: HistologySession): Promise<void> {
    this.sessions.set(session.id, session);
  }
  async update(session: HistologySession): Promise<void> {
    if (!this.sessions.has(session.id)) {
      throw new NotFoundError("That histology session could not be found.");
    }
    this.sessions.set(session.id, session);
  }
  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}

const timelineEvent: TimelineEvent = {
  id: "tl1",
  animalId: "an1",
  title: "Histopathology",
  category: "histopathology",
  status: "planned",
  createdAt: "t",
  updatedAt: "t",
};

function timelineReader(event: TimelineEvent | null): TimelineEventReader {
  return { async getById() { return event; } };
}
function animalReader(a: Animal | null): AnimalReader {
  return { async getById() { return a; } };
}
function studyReader(s: Study | null): StudyReader {
  return { async getById() { return s; } };
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
  return { id: "s1", name: "S", strain: "X", status, createdAt: "t", updatedAt: "t" };
}

let repo: FakeHistologySessionRepository;

interface DepsOptions {
  now?: string;
  event?: TimelineEvent | null;
  animal?: Animal | null;
  study?: Study | null;
}

function makeDeps(options: DepsOptions = {}): HistologySessionUseCaseDeps {
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
    ids: { next: () => `h-${++counter}` },
  };
}

beforeEach(() => {
  repo = new FakeHistologySessionRepository();
});

describe("createHistologySession", () => {
  it("creates a session with generated id/timestamps and normalized fields", async () => {
    const session = await createHistologySession(makeDeps(), {
      timelineEventId: "tl1",
      stain: "gfap",
      acquisitionDate: "2026-07-11",
      tissue: "  Lumbar spinal cord ",
      magnification: "  20× ",
    });
    expect(session.id).toBe("h-1");
    expect(session.timelineEventId).toBe("tl1");
    expect(session.stain).toBe("gfap");
    expect(session.acquisitionDate).toBe("2026-07-11");
    expect(session.tissue).toBe("Lumbar spinal cord");
    expect(session.magnification).toBe("20×");
    expect(session.operator).toBeUndefined();
    expect(session.createdAt).toBe("2026-07-13T00:00:00.000Z");
    expect(await repo.getById("h-1")).toEqual(session);
  });

  it("defaults an unspecified stain to H&E", async () => {
    const session = await createHistologySession(makeDeps(), {
      timelineEventId: "tl1",
      stain: undefined as unknown as HistologySession["stain"],
      acquisitionDate: "2026-07-11",
    });
    expect(session.stain).toBe("he");
  });

  it("rejects an unknown stain", async () => {
    await expect(
      createHistologySession(makeDeps(), {
        timelineEventId: "tl1",
        stain: "trichrome" as unknown as HistologySession["stain"],
        acquisitionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a malformed acquisition date", async () => {
    await expect(
      createHistologySession(makeDeps(), {
        timelineEventId: "tl1",
        stain: "he",
        acquisitionDate: "2026-02-30",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses when the timeline event does not exist", async () => {
    await expect(
      createHistologySession(makeDeps({ event: null }), {
        timelineEventId: "tl1",
        stain: "he",
        acquisitionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.sessions.size).toBe(0);
  });

  it("refuses when the study is archived", async () => {
    await expect(
      createHistologySession(makeDeps({ study: study("archived") }), {
        timelineEventId: "tl1",
        stain: "he",
        acquisitionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("updateHistologySession", () => {
  it("preserves timeline event and createdAt, refreshes updatedAt, clears optionals", async () => {
    const created = await createHistologySession(
      makeDeps({ now: "2026-01-01T00:00:00.000Z" }),
      {
        timelineEventId: "tl1",
        stain: "he",
        acquisitionDate: "2026-01-01",
        operator: "Sam",
      },
    );
    const updated = await updateHistologySession(
      makeDeps({ now: "2026-02-02T00:00:00.000Z" }),
      {
        id: created.id,
        stain: "nissl",
        acquisitionDate: "2026-02-01",
      },
    );
    expect(updated.timelineEventId).toBe("tl1");
    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.stain).toBe("nissl");
    // Clearing the operator (not supplied) removes it.
    expect(updated.operator).toBeUndefined();
  });

  it("throws NotFoundError for a missing session", async () => {
    await expect(
      updateHistologySession(makeDeps(), {
        id: "missing",
        stain: "he",
        acquisitionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses edits after the study is archived", async () => {
    const created = await createHistologySession(makeDeps(), {
      timelineEventId: "tl1",
      stain: "he",
      acquisitionDate: "2026-07-11",
    });
    await expect(
      updateHistologySession(makeDeps({ study: study("archived") }), {
        id: created.id,
        stain: "he",
        acquisitionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("listHistologySessions", () => {
  it("returns the sessions for a timeline event", async () => {
    await createHistologySession(makeDeps(), {
      timelineEventId: "tl1",
      stain: "he",
      acquisitionDate: "2026-07-11",
    });
    const list = await listHistologySessions(makeDeps(), "tl1");
    expect(list).toHaveLength(1);
    expect(list[0]?.timelineEventId).toBe("tl1");
  });
});
