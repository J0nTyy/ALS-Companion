import { describe, expect, it } from "vitest";

import { buildReportModel } from "@/application/export/report-model";
import { samplePackage } from "./package-fixture";

describe("buildReportModel", () => {
  const doc = buildReportModel(samplePackage());

  it("titles the report from the study and lists all report sections", () => {
    expect(doc.title).toContain("Study A, cohort 1");
    expect(doc.sections.map((s) => s.heading)).toEqual([
      "Study information",
      "Protocol",
      "Animals",
      "Experiment timeline",
      "Observations",
      "MRI sessions",
      "Research assets",
      "Annotations",
      "Measurements",
      "Longitudinal links",
      "Image references",
    ]);
  });

  it("builds a table for annotations with one row per annotation", () => {
    const section = doc.sections.find((s) => s.heading === "Annotations");
    const table = section?.blocks.find((b) => b.kind === "table");
    expect(table?.kind).toBe("table");
    if (table?.kind === "table") {
      expect(table.rows).toHaveLength(3);
    }
  });

  it("is deterministic (no timestamps)", () => {
    expect(buildReportModel(samplePackage())).toEqual(
      buildReportModel(samplePackage()),
    );
  });
});
