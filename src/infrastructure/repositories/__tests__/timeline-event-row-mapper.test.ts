import { describe, expect, it } from "vitest";

import {
  mapRowToTimelineEvent,
  type TimelineEventRow,
} from "@/infrastructure/repositories/timeline-event-row-mapper";

const baseRow: TimelineEventRow = {
  id: "tl1",
  animal_id: "an1",
  title: "Confirm SOD1 genotype",
  category: "gene_confirmation",
  status: "planned",
  planned_date: "2026-07-20",
  completed_date: null,
  notes: null,
  created_at: "2026-07-12T00:00:00.000Z",
  updated_at: "2026-07-12T00:00:00.000Z",
};

describe("mapRowToTimelineEvent", () => {
  it("maps a row and omits null optionals", () => {
    expect(mapRowToTimelineEvent(baseRow)).toEqual({
      id: "tl1",
      animalId: "an1",
      title: "Confirm SOD1 genotype",
      category: "gene_confirmation",
      status: "planned",
      plannedDate: "2026-07-20",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
    });
  });

  it("includes and trims a completed date and notes", () => {
    const event = mapRowToTimelineEvent({
      ...baseRow,
      status: "completed",
      completed_date: "2026-07-18",
      notes: "  done ",
    });
    expect(event.completedDate).toBe("2026-07-18");
    expect(event.notes).toBe("done");
  });

  it("throws on an empty title", () => {
    expect(() => mapRowToTimelineEvent({ ...baseRow, title: "   " })).toThrow();
  });

  it("throws on an unrecognized category", () => {
    expect(() =>
      mapRowToTimelineEvent({ ...baseRow, category: "surgery" }),
    ).toThrow();
  });

  it("throws on an unrecognized status", () => {
    expect(() =>
      mapRowToTimelineEvent({ ...baseRow, status: "cancelled" }),
    ).toThrow();
  });

  it("throws on a malformed planned or completed date", () => {
    expect(() =>
      mapRowToTimelineEvent({ ...baseRow, planned_date: "2026/07/20" }),
    ).toThrow();
    expect(() =>
      mapRowToTimelineEvent({ ...baseRow, completed_date: "2026-02-30" }),
    ).toThrow();
  });
});
