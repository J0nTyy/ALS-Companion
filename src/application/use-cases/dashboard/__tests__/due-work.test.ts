import { describe, expect, it } from "vitest";

import type { TimelineEventSummary } from "@/application/ports/dashboard-reader";
import { computeDueWork } from "@/application/use-cases/dashboard/due-work";

function ev(over: Partial<TimelineEventSummary>): TimelineEventSummary {
  return {
    id: "e",
    animalId: "a",
    studyId: "s",
    animalIdentifier: "M-1",
    title: "T",
    category: "mri",
    status: "planned",
    updatedAt: "t",
    ...over,
  };
}

const today = "2026-07-13";

describe("computeDueWork", () => {
  it("buckets planned events into today and overdue (future excluded)", () => {
    const planned = [
      ev({ id: "today1", plannedDate: today }),
      ev({ id: "over1", plannedDate: "2026-07-10" }),
      ev({ id: "future1", plannedDate: "2026-07-20" }),
    ];
    const dw = computeDueWork(planned, [], today);
    expect(dw.today.map((e) => e.id)).toEqual(["today1"]);
    expect(dw.overdue.map((e) => e.id)).toEqual(["over1"]);
  });

  it("counts only completions within the last 7 days as recently completed", () => {
    const completed = [
      ev({ id: "c-recent", status: "completed", completedDate: "2026-07-10" }),
      ev({ id: "c-today", status: "completed", completedDate: today }),
      // cutoff is 2026-07-06, so this is too old:
      ev({ id: "c-old", status: "completed", completedDate: "2026-07-01" }),
    ];
    const dw = computeDueWork([], completed, today);
    expect(dw.recentlyCompleted.map((e) => e.id).sort()).toEqual([
      "c-recent",
      "c-today",
    ]);
  });

  it("ignores planned events with no planned date", () => {
    const dw = computeDueWork([ev({ id: "x" })], [], today);
    expect(dw.today).toEqual([]);
    expect(dw.overdue).toEqual([]);
  });

  it("returns empty buckets for empty input", () => {
    expect(computeDueWork([], [], today)).toEqual({
      today: [],
      overdue: [],
      recentlyCompleted: [],
    });
  });
});
