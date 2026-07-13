import { describe, expect, it } from "vitest";

import { assemblePackage } from "@/application/use-cases/publication/assemble-package";
import { previewPackage } from "@/application/use-cases/publication/package-preview";
import { fullSelection } from "@/application/use-cases/publication/workspace-selection";
import type { WorkspaceStudyContents } from "@/application/use-cases/publication/publication-package";
import { toJsonDocument } from "@/application/export/exporters/json-exporter";
import { csvExporter } from "@/application/export/exporters/csv-exporter";
import { buildReportModel } from "@/application/export/report-model";
import {
  biomarkerResult,
  biomarkerSample,
  event,
  sampleContents,
} from "./fixtures";

/**
 * A study whose biochemical-analysis event carries a biomarker sample with two
 * laboratory results (one qualitative). Exercises the whole v2.0 flow: biomarkers
 * flow through selection → package → JSON/CSV/report exports.
 */
function contentsWithBiomarkers(): WorkspaceStudyContents {
  const c = sampleContents();
  return {
    ...c,
    timelineEvents: [
      ...c.timelineEvents,
      event("eB", "a1", { category: "biochemical_analysis" }),
    ],
    biomarkerSamples: [biomarkerSample("bs1", "eB", { sampleType: "csf" })],
    biomarkerResults: [
      biomarkerResult("br1", "bs1", {
        biomarkerName: "Neurofilament Light (NfL)",
        value: "45.2",
        unit: "pg/mL",
      }),
      biomarkerResult("br2", "bs1", {
        biomarkerName: "GFAP",
        value: "< 0.05",
      }),
    ],
  };
}

const decode = (bytes?: Uint8Array) => new TextDecoder().decode(bytes);

describe("biomarkers flow through the publication package", () => {
  const contents = contentsWithBiomarkers();
  const pkg = assemblePackage(contents, fullSelection(contents));

  it("includes the selected sample and its results", () => {
    expect(pkg.biomarkerSamples.map((s) => s.id)).toEqual(["bs1"]);
    expect(pkg.biomarkerResults.map((r) => r.id).sort()).toEqual([
      "br1",
      "br2",
    ]);
  });

  it("counts biomarker samples and results in the preview", () => {
    const byKey = Object.fromEntries(
      previewPackage(pkg).sections.map((s) => [s.key, s.count]),
    );
    expect(byKey.biomarkerSamples).toBe(1);
    expect(byKey.biomarkerResults).toBe(2);
  });

  it("drops a sample's results when the sample is not selected", () => {
    const filtered = assemblePackage(contents, {
      ...fullSelection(contents),
      biomarkerSampleIds: [],
    });
    expect(filtered.biomarkerSamples).toHaveLength(0);
    expect(filtered.biomarkerResults).toHaveLength(0);
  });
});

describe("biomarkers appear in every export format", () => {
  const contents = contentsWithBiomarkers();
  const pkg = assemblePackage(contents, fullSelection(contents));

  it("JSON carries biomarkerSamples + biomarkerResults arrays", () => {
    const doc = toJsonDocument(pkg) as Record<string, unknown>;
    expect((doc.biomarkerSamples as unknown[]).length).toBe(1);
    expect((doc.biomarkerResults as unknown[]).length).toBe(2);
  });

  it("CSV emits biomarker_samples.csv and biomarker_results.csv with rows", () => {
    const files = csvExporter(pkg);
    const samples = decode(
      files.find((f) => f.name === "biomarker_samples.csv")?.bytes,
    );
    const results = decode(
      files.find((f) => f.name === "biomarker_results.csv")?.bytes,
    );
    expect(samples.split("\n")[0]).toBe(
      "id,timeline_event_id,sample_type,collection_date,operator,notes",
    );
    expect(samples).toContain("bs1,eB,csf");
    expect(results.split("\n")[0]).toBe(
      "id,biomarker_sample_id,biomarker_name,value,unit,method,notes,created_at",
    );
    // Qualitative value preserved verbatim.
    expect(results).toContain("< 0.05");
  });

  it("the report model includes Biomarker samples + results tables", () => {
    const doc = buildReportModel(pkg);
    const samples = doc.sections.find((s) => s.heading === "Biomarker samples");
    const results = doc.sections.find((s) => s.heading === "Biomarker results");
    const samplesTable = samples?.blocks.find((b) => b.kind === "table");
    const resultsTable = results?.blocks.find((b) => b.kind === "table");
    expect(samplesTable?.kind).toBe("table");
    expect(resultsTable?.kind).toBe("table");
    if (resultsTable?.kind === "table") {
      expect(resultsTable.rows).toHaveLength(2);
      expect(resultsTable.rows[0]).toContain("Neurofilament Light (NfL)");
    }
  });
});
