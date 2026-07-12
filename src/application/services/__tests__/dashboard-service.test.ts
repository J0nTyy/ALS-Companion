import { describe, expect, it } from "vitest";

import type { Study } from "@/domain/entities/study";
import type {
  DashboardSnapshot,
  TimelineEventSummary,
} from "@/application/ports/dashboard-reader";
import type { StudiesService } from "@/application/services/studies-service";
import { createDashboardService } from "@/application/services/dashboard-service";

const TODAY = "2026-07-13";

function ev(over: Partial<TimelineEventSummary>): TimelineEventSummary {
  return {
    id: "e",
    animalId: "a1",
    studyId: "s1",
    animalIdentifier: "M-1",
    title: "MRI scan",
    category: "mri",
    status: "planned",
    updatedAt: "2026-07-13T00:00:00.000Z",
    ...over,
  };
}

function emptySnapshot(): DashboardSnapshot {
  return {
    counts: {
      animals: 0,
      observations: 0,
      mriSessions: 0,
      researchAssets: 0,
      timelinePlanned: 0,
      timelineCompleted: 0,
    },
    recentAnimals: [],
    recentObservations: [],
    recentMriSessions: [],
    recentResearchAssets: [],
    plannedEvents: [],
    recentCompletedEvents: [],
  };
}

function makeService(studies: Study[], snapshot: DashboardSnapshot) {
  const studiesService: StudiesService = {
    list: async () => studies,
    get: async () => null,
    create: async () => {
      throw new Error("unused");
    },
    update: async () => {
      throw new Error("unused");
    },
    archive: async () => {},
  };
  return createDashboardService({
    studies: studiesService,
    reader: { load: async () => snapshot },
    calendar: { today: () => TODAY },
  });
}

const study = (over: Partial<Study>): Study => ({
  id: "s1",
  name: "Study A",
  strain: "SOD1",
  status: "active",
  createdAt: "t",
  updatedAt: "2026-07-13T10:00:00.000Z",
  ...over,
});

describe("DashboardService.load — aggregation", () => {
  it("shapes counts, current study, upcoming, due work, and quick actions", async () => {
    const studies = [
      study({ id: "s1", status: "active", updatedAt: "2026-07-13T10:00:00.000Z" }),
      study({ id: "s0", status: "archived", updatedAt: "2026-07-14T10:00:00.000Z" }),
    ];
    const snapshot: DashboardSnapshot = {
      ...emptySnapshot(),
      counts: {
        animals: 3,
        observations: 5,
        mriSessions: 2,
        researchAssets: 1,
        timelinePlanned: 4,
        timelineCompleted: 6,
      },
      plannedEvents: [
        ev({ id: "today", plannedDate: TODAY }),
        ev({ id: "future", plannedDate: "2026-07-20" }),
        ev({ id: "overdue", plannedDate: "2026-07-01" }),
      ],
      recentCompletedEvents: [
        ev({ id: "done", status: "completed", completedDate: "2026-07-12" }),
      ],
    };

    const vm = await makeService(studies, snapshot).load();

    // Study counts come from the studies list; entity counts from the snapshot.
    expect(vm.counts.studiesTotal).toBe(2);
    expect(vm.counts.studiesActive).toBe(1);
    expect(vm.counts.studiesArchived).toBe(1);
    expect(vm.counts.animals).toBe(3);
    expect(vm.counts.observations).toBe(5);

    // Current study = most recent non-archived (skips the newer archived one).
    expect(vm.currentStudy?.id).toBe("s1");

    // Upcoming = planned events dated today or later.
    expect(vm.upcomingEvents.map((e) => e.id)).toEqual(["today", "future"]);

    // Due work buckets.
    expect(vm.dueWork.today.map((e) => e.id)).toEqual(["today"]);
    expect(vm.dueWork.overdue.map((e) => e.id)).toEqual(["overdue"]);
    expect(vm.dueWork.recentlyCompleted.map((e) => e.id)).toEqual(["done"]);

    // Quick actions bind study-scoped shortcuts to the current study.
    const byId = Object.fromEntries(vm.quickActions.map((a) => [a.id, a.to]));
    expect(byId["new-animal"]).toBe("/studies/s1");
  });
});

describe("DashboardService.load — empty workspace", () => {
  it("returns a valid, empty view model (no fabrication)", async () => {
    const vm = await makeService([], emptySnapshot()).load();

    expect(vm.currentStudy).toBeNull();
    expect(vm.recentStudies).toEqual([]);
    expect(vm.recentAnimals).toEqual([]);
    expect(vm.upcomingEvents).toEqual([]);
    expect(vm.recentlyCompletedEvents).toEqual([]);
    expect(vm.recentObservations).toEqual([]);
    expect(vm.recentMriSessions).toEqual([]);
    expect(vm.recentResearchAssets).toEqual([]);
    expect(vm.recentActivity).toEqual([]);
    expect(vm.dueWork).toEqual({ today: [], overdue: [], recentlyCompleted: [] });
    expect(vm.counts).toEqual({
      studiesTotal: 0,
      studiesActive: 0,
      studiesArchived: 0,
      animals: 0,
      observations: 0,
      mriSessions: 0,
      researchAssets: 0,
      timelinePlanned: 0,
      timelineCompleted: 0,
    });
    // Quick actions still present; study-scoped ones fall back to the list.
    const byId = Object.fromEntries(vm.quickActions.map((a) => [a.id, a.to]));
    expect(byId["new-animal"]).toBe("/studies");
  });
});
