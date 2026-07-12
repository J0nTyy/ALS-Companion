import { describe, expect, it } from "vitest";

import {
  collapseComparableSessions,
  type ComparableSessionRow,
} from "@/infrastructure/repositories/mri-comparison-collapse";

function row(over: Partial<ComparableSessionRow> = {}): ComparableSessionRow {
  return {
    session_id: "m1",
    session_title: "S1",
    modality: "mri",
    acquisition_date: "2026-07-10",
    anatomical_region: null,
    operator: null,
    study_id: "s1",
    study_name: "Study",
    animal_id: "a1",
    animal_identifier: "M-1",
    timeline_event_id: "t1",
    timeline_event_title: "MRI",
    file_id: "f1",
    relative_path: "images/f1.png",
    original_name: "f1.png",
    mime_type: "image/png",
    file_created_at: "2026-07-10T00:00:00.000Z",
    ...over,
  };
}

describe("collapseComparableSessions", () => {
  it("keeps the most recent file per session (order-independent)", () => {
    const sessions = collapseComparableSessions([
      row({ file_id: "new", file_created_at: "2026-06-01T00:00:00.000Z" }),
      row({ file_id: "old", file_created_at: "2026-01-01T00:00:00.000Z" }),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.image.storedFileId).toBe("new");
  });

  it("returns one entry per session, newest acquisition first", () => {
    const sessions = collapseComparableSessions([
      row({ session_id: "m1", acquisition_date: "2026-01-01" }),
      row({ session_id: "m2", acquisition_date: "2026-06-01" }),
    ]);
    expect(sessions.map((s) => s.sessionId)).toEqual(["m2", "m1"]);
  });

  it("omits absent region/operator and trims present ones", () => {
    const [plain] = collapseComparableSessions([row()]);
    expect(plain && "region" in plain).toBe(false);
    expect(plain && "operator" in plain).toBe(false);

    const [withRegion] = collapseComparableSessions([
      row({ anatomical_region: "  Brain ", operator: "  Sam " }),
    ]);
    expect(withRegion?.region).toBe("Brain");
    expect(withRegion?.operator).toBe("Sam");
  });

  it("returns an empty list for no rows", () => {
    expect(collapseComparableSessions([])).toEqual([]);
  });
});
