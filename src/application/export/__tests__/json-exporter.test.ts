import { describe, expect, it } from "vitest";

import {
  EXPORT_SCHEMA_VERSION,
  jsonExporter,
  toJsonDocument,
} from "@/application/export/exporters/json-exporter";
import { samplePackage } from "./package-fixture";

describe("jsonExporter", () => {
  it("produces one pretty-printed .json file named from the study", () => {
    const files = jsonExporter(samplePackage());
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe("study-a-cohort-1.json");
    const text = new TextDecoder().decode(files[0]?.bytes);
    // Pretty printed (indented).
    expect(text).toContain('\n  "schemaVersion"');
  });

  it("serializes a stable, complete schema", () => {
    const doc = toJsonDocument(samplePackage()) as Record<string, unknown>;
    expect(doc.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(Object.keys(doc).sort()).toEqual(
      [
        "animals",
        "annotationLinks",
        "annotations",
        "biomarkerResults",
        "biomarkerSamples",
        "histologySessions",
        "measurements",
        "mriSessions",
        "observations",
        "protocol",
        "researchAssets",
        "schemaVersion",
        "storedFiles",
        "study",
        "timelineEvents",
      ].sort(),
    );
    // Annotations, derived measurements, and links are present.
    expect((doc.annotations as unknown[]).length).toBe(3);
    expect((doc.measurements as unknown[]).length).toBe(3);
    expect((doc.annotationLinks as unknown[]).length).toBe(1);
  });
});
