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
      "Histology sessions",
      "Biomarker samples",
      "Biomarker results",
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

  it("adds a Summary section (right after Study information) when the study has one", () => {
    const base = samplePackage();
    const pkg = { ...base, study: { ...base.study, summary: "A concise study summary." } };
    const withSummary = buildReportModel(pkg);
    expect(withSummary.sections[1]?.heading).toBe("Summary");
    expect(withSummary.sections[1]?.blocks[0]).toEqual({
      kind: "paragraph",
      text: "A concise study summary.",
    });
  });

  it("omits the Summary section when the study has no summary", () => {
    expect(
      buildReportModel(samplePackage()).sections.some((s) => s.heading === "Summary"),
    ).toBe(false);
  });
});
