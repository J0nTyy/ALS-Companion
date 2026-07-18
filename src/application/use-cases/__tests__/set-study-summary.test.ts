import { describe, expect, it } from "vitest";

import type { Study } from "@/domain/entities/study";
import type { StudyRepository } from "@/application/ports/study-repository";
import type { StudyUseCaseDeps } from "@/application/use-cases/deps";
import { setStudySummary } from "@/application/use-cases/set-study-summary";
import { NotFoundError } from "@/application/errors";

const study: Study = {
  id: "s1",
  name: "Cohort A",
  strain: "SOD1-G93A",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeDeps(existing: Study | null): { deps: StudyUseCaseDeps; saved: Study[] } {
  const saved: Study[] = [];
  const repository = {
    getById: async () => existing,
    update: async (updated: Study) => {
      saved.push(updated);
    },
  } as unknown as StudyRepository;
  const deps = {
    repository,
    clock: { now: () => "2026-07-18T10:00:00.000Z" },
    ids: { next: () => "id" },
  } as unknown as StudyUseCaseDeps;
  return { deps, saved };
}

describe("setStudySummary", () => {
  it("sets a trimmed summary, refreshes updatedAt, and leaves other fields intact", async () => {
    const { deps, saved } = makeDeps(study);
    const result = await setStudySummary(deps, "s1", "  A survival cohort study.  ");
    expect(result.summary).toBe("A survival cohort study.");
    expect(result.name).toBe("Cohort A");
    expect(result.updatedAt).toBe("2026-07-18T10:00:00.000Z");
    expect(result.summaryUpdatedAt).toBe("2026-07-18T10:00:00.000Z");
    expect(saved[0]?.summary).toBe("A survival cohort study.");
  });

  it("clears the summary and its timestamp when given blank text", async () => {
    const { deps, saved } = makeDeps({
      ...study,
      summary: "old summary",
      summaryUpdatedAt: "2026-01-02T00:00:00.000Z",
    });
    const result = await setStudySummary(deps, "s1", "   ");
    expect("summary" in result).toBe(false);
    expect("summaryUpdatedAt" in result).toBe(false);
    expect(saved[0] !== undefined && "summary" in saved[0]).toBe(false);
  });

  it("throws NotFoundError for a missing study", async () => {
    const { deps } = makeDeps(null);
    await expect(setStudySummary(deps, "nope", "x")).rejects.toBeInstanceOf(NotFoundError);
  });
});
