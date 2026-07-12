import { describe, expect, it } from "vitest";

import type { Study } from "@/domain/entities/study";
import type { DashboardSnapshot } from "@/application/ports/dashboard-reader";
import type { ActivityItem } from "@/application/use-cases/dashboard/dashboard-view";
import {
  buildRecentActivity,
  groupActivityByDay,
} from "@/application/use-cases/dashboard/recent-activity";

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

const study = (over: Partial<Study>): Study => ({
  id: "s1",
  name: "Study A",
  strain: "SOD1",
  status: "active",
  createdAt: "t",
  updatedAt: "2026-07-13T10:00:00.000Z",
  ...over,
});

describe("buildRecentActivity", () => {
  it("merges entities newest-first with routes and labels", () => {
    const studies = [study({ id: "s1", updatedAt: "2026-07-13T10:00:00.000Z" })];
    const snapshot: DashboardSnapshot = {
      ...emptySnapshot(),
      recentAnimals: [
        {
          id: "an1",
          studyId: "s1",
          studyName: "Study A",
          animalIdentifier: "M-1",
          updatedAt: "2026-07-13T08:00:00.000Z",
        },
      ],
      recentObservations: [
        {
          id: "o1",
          animalId: "an1",
          studyId: "s1",
          animalIdentifier: "M-1",
          kind: "body_weight",
          observedOn: "2026-07-12",
          updatedAt: "2026-07-13T12:00:00.000Z",
        },
      ],
    };

    const items = buildRecentActivity({ studies, snapshot });
    // 12:00 (obs) > 10:00 (study) > 08:00 (animal)
    expect(items.map((i) => i.id)).toEqual(["o1", "s1", "an1"]);
    const obs = items[0];
    expect(obs?.type).toBe("observation");
    expect(obs?.title).toBe("Body weight"); // kind label, not the raw enum
    expect(obs?.route).toBe("/studies/s1/animals/an1");
  });

  it("respects the limit", () => {
    const studies = [
      study({ id: "s1", updatedAt: "2026-07-13T03:00:00.000Z" }),
      study({ id: "s2", updatedAt: "2026-07-13T02:00:00.000Z" }),
      study({ id: "s3", updatedAt: "2026-07-13T01:00:00.000Z" }),
    ];
    const items = buildRecentActivity({ studies, snapshot: emptySnapshot() }, 2);
    expect(items.map((i) => i.id)).toEqual(["s1", "s2"]);
  });
});

describe("groupActivityByDay", () => {
  const item = (id: string, timestamp: string): ActivityItem => ({
    type: "study",
    id,
    title: id,
    route: "/x",
    timestamp,
  });

  it("groups a sorted feed by day with Today/Yesterday labels", () => {
    const groups = groupActivityByDay(
      [
        item("1", "2026-07-13T10:00:00.000Z"),
        item("2", "2026-07-13T09:00:00.000Z"),
        item("3", "2026-07-12T09:00:00.000Z"),
        item("4", "2026-07-01T09:00:00.000Z"),
      ],
      "2026-07-13",
    );
    expect(groups.map((g) => g.label)).toEqual([
      "Today",
      "Yesterday",
      "2026-07-01",
    ]);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[1]?.key).toBe("2026-07-12");
  });

  it("is empty for no items", () => {
    expect(groupActivityByDay([], "2026-07-13")).toEqual([]);
  });
});
