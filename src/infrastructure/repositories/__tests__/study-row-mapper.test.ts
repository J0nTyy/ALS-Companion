import { describe, expect, it } from "vitest";

import {
  mapRowToStudy,
  type StudyRow,
} from "@/infrastructure/repositories/study-row-mapper";

const baseRow: StudyRow = {
  id: "1",
  name: "Cohort A",
  description: null,
  summary: null,
  summary_updated_at: null,
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

  it("includes a trimmed, non-empty summary", () => {
    const study = mapRowToStudy({ ...baseRow, summary: "  A survival cohort. " });
    expect(study.summary).toBe("A survival cohort.");
  });

  it("omits a NULL summary", () => {
    expect("summary" in mapRowToStudy(baseRow)).toBe(false);
  });

  it("includes summaryUpdatedAt alongside a summary", () => {
    const study = mapRowToStudy({
      ...baseRow,
      summary: "A survival cohort.",
      summary_updated_at: "2026-07-18T10:00:00.000Z",
    });
    expect(study.summaryUpdatedAt).toBe("2026-07-18T10:00:00.000Z");
  });

  it("omits summaryUpdatedAt when there is no summary", () => {
    const study = mapRowToStudy({ ...baseRow, summary_updated_at: "2026-07-18T10:00:00.000Z" });
    expect("summaryUpdatedAt" in study).toBe(false);
  });

  it("throws on an unrecognized status so corrupt data surfaces", () => {
    expect(() => mapRowToStudy({ ...baseRow, status: "bogus" })).toThrow();
  });
});
