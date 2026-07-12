import { describe, expect, it } from "vitest";

import {
  mapRowToStudy,
  type StudyRow,
} from "@/infrastructure/repositories/study-row-mapper";

const baseRow: StudyRow = {
  id: "1",
  name: "Cohort A",
  description: null,
  strain: "SOD1-G93A",
  status: "active",
  created_at: "2026-07-12T00:00:00.000Z",
  updated_at: "2026-07-12T09:30:00.000Z",
};

describe("mapRowToStudy", () => {
  it("maps snake_case columns to the domain entity", () => {
    expect(mapRowToStudy(baseRow)).toEqual({
      id: "1",
      name: "Cohort A",
      strain: "SOD1-G93A",
      status: "active",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T09:30:00.000Z",
    });
  });

  it("omits a NULL description", () => {
    expect("description" in mapRowToStudy(baseRow)).toBe(false);
  });

  it("includes a trimmed, non-empty description", () => {
    const study = mapRowToStudy({ ...baseRow, description: "  daily weights " });
    expect(study.description).toBe("daily weights");
  });

  it("omits a whitespace-only description", () => {
    const study = mapRowToStudy({ ...baseRow, description: "   " });
    expect("description" in study).toBe(false);
  });

  it("throws on an unrecognized status so corrupt data surfaces", () => {
    expect(() => mapRowToStudy({ ...baseRow, status: "bogus" })).toThrow();
  });
});
