import { describe, expect, it } from "vitest";

import {
  mapRowToHistologySession,
  type HistologySessionRow,
} from "@/infrastructure/repositories/histology-session-row-mapper";

const baseRow: HistologySessionRow = {
  id: "h1",
  timeline_event_id: "tl1",
  stain: "he",
  tissue: null,
  magnification: null,
  acquisition_date: "2026-07-11",
  operator: null,
  notes: null,
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToHistologySession", () => {
  it("maps a row and omits null optionals", () => {
    expect(mapRowToHistologySession(baseRow)).toEqual({
      id: "h1",
      timelineEventId: "tl1",
      stain: "he",
      acquisitionDate: "2026-07-11",
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("includes and trims populated optionals", () => {
    const session = mapRowToHistologySession({
      ...baseRow,
      stain: "gfap",
      tissue: "  Lumbar spinal cord ",
      magnification: "  20× ",
      operator: "  Sam ",
      notes: "  astrocytes ",
    });
    expect(session.stain).toBe("gfap");
    expect(session.tissue).toBe("Lumbar spinal cord");
    expect(session.magnification).toBe("20×");
    expect(session.operator).toBe("Sam");
    expect(session.notes).toBe("astrocytes");
  });

  it("throws on an unrecognized stain or an invalid acquisition date", () => {
    expect(() =>
      mapRowToHistologySession({ ...baseRow, stain: "trichrome" }),
    ).toThrow();
    expect(() =>
      mapRowToHistologySession({ ...baseRow, acquisition_date: "2026/07/11" }),
    ).toThrow();
    expect(() =>
      mapRowToHistologySession({ ...baseRow, acquisition_date: "2026-02-30" }),
    ).toThrow();
  });
});
