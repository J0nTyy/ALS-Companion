import { beforeEach, describe, expect, it } from "vitest";

import type { Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";
import type { BiomarkerResult } from "@/domain/entities/biomarker-result";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import type { BiomarkerSampleRepository } from "@/application/ports/biomarker-sample-repository";
import type { BiomarkerResultRepository } from "@/application/ports/biomarker-result-repository";
import type { BiomarkerUseCaseDeps } from "@/application/use-cases/deps";
import {
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import { createBiomarkerSample } from "@/application/use-cases/create-biomarker-sample";
import { updateBiomarkerSample } from "@/application/use-cases/update-biomarker-sample";
import { deleteBiomarkerSample } from "@/application/use-cases/delete-biomarker-sample";
import { createBiomarkerResult } from "@/application/use-cases/create-biomarker-result";
import { updateBiomarkerResult } from "@/application/use-cases/update-biomarker-result";
import { deleteBiomarkerResult } from "@/application/use-cases/delete-biomarker-result";
import { listBiomarkerResults } from "@/application/use-cases/list-biomarker-results";

class FakeSampleRepo implements BiomarkerSampleRepository {
  readonly samples = new Map<string, BiomarkerSample>();
  async listByTimelineEvent(id: string) {
    return [...this.samples.values()].filter((s) => s.timelineEventId === id);
  }
  async getById(id: string) {
    return this.samples.get(id) ?? null;
  }
  async create(s: BiomarkerSample) {
    this.samples.set(s.id, s);
  }
  async update(s: BiomarkerSample) {
    if (!this.samples.has(s.id)) throw new NotFoundError("missing sample");
    this.samples.set(s.id, s);
  }
  async delete(id: string) {
    this.samples.delete(id);
  }
}

class FakeResultRepo implements BiomarkerResultRepository {
  readonly results = new Map<string, BiomarkerResult>();
  async listBySample(id: string) {
    return [...this.results.values()].filter((r) => r.biomarkerSampleId === id);
  }
  async getById(id: string) {
    return this.results.get(id) ?? null;
  }
  async create(r: BiomarkerResult) {
    this.results.set(r.id, r);
  }
  async update(r: BiomarkerResult) {
    if (!this.results.has(r.id)) throw new NotFoundError("missing result");
    this.results.set(r.id, r);
  }
  async delete(id: string) {
    this.results.delete(id);
  }
}

const timelineEvent: TimelineEvent = {
  id: "tl1",
  animalId: "an1",
  title: "Biochemical analysis",
  category: "biochemical_analysis",
  status: "planned",
  createdAt: "t",
  updatedAt: "t",
};

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

let samples: FakeSampleRepo;
let results: FakeResultRepo;

interface DepsOptions {
  now?: string;
  event?: TimelineEvent | null;
  study?: Study | null;
}

function makeDeps(options: DepsOptions = {}): BiomarkerUseCaseDeps {
  let counter = 0;
  const now = options.now ?? "2026-07-13T00:00:00.000Z";
  const timelineEvents: TimelineEventReader = {
    async getById() {
      return options.event !== undefined ? options.event : timelineEvent;
    },
  };
  const animals: AnimalReader = { async getById() { return animal(); } };
  const studies: StudyReader = {
    async getById() {
      return options.study !== undefined ? options.study : study();
    },
  };
  return {
    samples,
    results,
    timelineEvents,
    animals,
    studies,
    clock: { now: () => now },
    ids: { next: () => `id-${++counter}` },
  };
}

beforeEach(() => {
  samples = new FakeSampleRepo();
  results = new FakeResultRepo();
});

describe("createBiomarkerSample", () => {
  it("creates a sample with generated id/timestamps and normalized fields", async () => {
    const sample = await createBiomarkerSample(makeDeps(), {
      timelineEventId: "tl1",
      sampleType: "csf",
      collectionDate: "2026-07-11",
      operator: "  Sam ",
    });
    expect(sample.id).toBe("id-1");
    expect(sample.sampleType).toBe("csf");
    expect(sample.operator).toBe("Sam");
    expect(sample.notes).toBeUndefined();
    expect(await samples.getById("id-1")).toEqual(sample);
  });

  it("rejects an unknown sample type and a bad collection date", async () => {
    await expect(
      createBiomarkerSample(makeDeps(), {
        timelineEventId: "tl1",
        sampleType: "plasma" as unknown as BiomarkerSample["sampleType"],
        collectionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createBiomarkerSample(makeDeps(), {
        timelineEventId: "tl1",
        sampleType: "blood",
        collectionDate: "2026-02-30",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses when the event is missing or the study is archived", async () => {
    await expect(
      createBiomarkerSample(makeDeps({ event: null }), {
        timelineEventId: "tl1",
        sampleType: "blood",
        collectionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      createBiomarkerSample(makeDeps({ study: study("archived") }), {
        timelineEventId: "tl1",
        sampleType: "blood",
        collectionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("updateBiomarkerSample", () => {
  it("refreshes updatedAt, preserves createdAt, clears optionals", async () => {
    const created = await createBiomarkerSample(
      makeDeps({ now: "2026-01-01T00:00:00.000Z" }),
      { timelineEventId: "tl1", sampleType: "blood", collectionDate: "2026-01-01", operator: "Sam" },
    );
    const updated = await updateBiomarkerSample(
      makeDeps({ now: "2026-02-02T00:00:00.000Z" }),
      { id: created.id, sampleType: "muscle", collectionDate: "2026-02-01" },
    );
    expect(updated.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(updated.updatedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(updated.sampleType).toBe("muscle");
    expect(updated.operator).toBeUndefined();
  });

  it("throws NotFoundError for a missing sample", async () => {
    await expect(
      updateBiomarkerSample(makeDeps(), {
        id: "nope",
        sampleType: "blood",
        collectionDate: "2026-07-11",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteBiomarkerSample", () => {
  it("removes the sample and all its results", async () => {
    const deps = makeDeps();
    const sample = await createBiomarkerSample(deps, {
      timelineEventId: "tl1",
      sampleType: "blood",
      collectionDate: "2026-07-11",
    });
    await createBiomarkerResult(deps, {
      biomarkerSampleId: sample.id,
      biomarkerName: "NfL",
      value: "45",
    });
    await createBiomarkerResult(deps, {
      biomarkerSampleId: sample.id,
      biomarkerName: "GFAP",
      value: "12",
    });
    expect(results.results.size).toBe(2);

    await deleteBiomarkerSample(deps, sample.id);
    expect(samples.samples.size).toBe(0);
    expect(results.results.size).toBe(0);
  });

  it("refuses to delete on an archived study", async () => {
    const sample = await createBiomarkerSample(makeDeps(), {
      timelineEventId: "tl1",
      sampleType: "blood",
      collectionDate: "2026-07-11",
    });
    await expect(
      deleteBiomarkerSample(makeDeps({ study: study("archived") }), sample.id),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });
});

describe("biomarker results", () => {
  async function seedSample() {
    return createBiomarkerSample(makeDeps(), {
      timelineEventId: "tl1",
      sampleType: "blood",
      collectionDate: "2026-07-11",
    });
  }

  it("creates a result with a verbatim value (no normalization)", async () => {
    const sample = await seedSample();
    const result = await createBiomarkerResult(makeDeps(), {
      biomarkerSampleId: sample.id,
      biomarkerName: "NfL",
      value: "< 0.05",
      unit: "pg/mL",
    });
    expect(result.value).toBe("< 0.05");
    expect(result.unit).toBe("pg/mL");
    expect((await listBiomarkerResults(makeDeps(), sample.id)).length).toBe(1);
  });

  it("requires a biomarker name and a value", async () => {
    const sample = await seedSample();
    await expect(
      createBiomarkerResult(makeDeps(), {
        biomarkerSampleId: sample.id,
        biomarkerName: "  ",
        value: "1",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createBiomarkerResult(makeDeps(), {
        biomarkerSampleId: sample.id,
        biomarkerName: "NfL",
        value: "  ",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses a result on a missing sample or an archived study", async () => {
    await expect(
      createBiomarkerResult(makeDeps(), {
        biomarkerSampleId: "missing",
        biomarkerName: "NfL",
        value: "1",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const sample = await seedSample();
    await expect(
      createBiomarkerResult(makeDeps({ study: study("archived") }), {
        biomarkerSampleId: sample.id,
        biomarkerName: "NfL",
        value: "1",
      }),
    ).rejects.toBeInstanceOf(StudyArchivedError);
  });

  it("updates and deletes a result", async () => {
    const deps = makeDeps();
    const sample = await seedSample();
    const result = await createBiomarkerResult(deps, {
      biomarkerSampleId: sample.id,
      biomarkerName: "NfL",
      value: "45",
      unit: "pg/mL",
    });
    const updated = await updateBiomarkerResult(deps, {
      id: result.id,
      biomarkerName: "NfL",
      value: "50",
    });
    expect(updated.value).toBe("50");
    // Clearing the unit (not supplied) removes it.
    expect(updated.unit).toBeUndefined();

    await deleteBiomarkerResult(deps, result.id);
    expect(results.results.size).toBe(0);
  });
});
