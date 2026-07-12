import { describe, expect, it } from "vitest";

import {
  mapRowToMriSession,
  type MriSessionRow,
} from "@/infrastructure/repositories/mri-session-row-mapper";

const baseRow: MriSessionRow = {
  id: "mri1",
  timeline_event_id: "tl1",
  title: "Baseline brain MRI",
  modality: "mri",
  anatomical_region: null,
  acquisition_date: "2026-07-10",
  operator: null,
  notes: null,
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToMriSession", () => {
  it("maps a row and omits null optionals", () => {
    expect(mapRowToMriSession(baseRow)).toEqual({
      id: "mri1",
      timelineEventId: "tl1",
      title: "Baseline brain MRI",
      modality: "mri",
      acquisitionDate: "2026-07-10",
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("includes and trims populated optionals", () => {
    const session = mapRowToMriSession({
      ...baseRow,
      anatomical_region: "  Brain ",
      operator: "  Sam ",
      notes: "  T2 ",
    });
    expect(session.anatomicalRegion).toBe("Brain");
    expect(session.operator).toBe("Sam");
    expect(session.notes).toBe("T2");
  });

  it("throws on empty title, bad modality, or invalid acquisition date", () => {
    expect(() => mapRowToMriSession({ ...baseRow, title: "  " })).toThrow();
    expect(() =>
      mapRowToMriSession({ ...baseRow, modality: "pet" }),
    ).toThrow();
    expect(() =>
      mapRowToMriSession({ ...baseRow, acquisition_date: "2026/07/10" }),
    ).toThrow();
    expect(() =>
      mapRowToMriSession({ ...baseRow, acquisition_date: "2026-02-30" }),
    ).toThrow();
  });
});
