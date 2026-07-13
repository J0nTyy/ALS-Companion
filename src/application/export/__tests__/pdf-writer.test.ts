import { describe, expect, it } from "vitest";

import { buildReportModel } from "@/application/export/report-model";
import { renderReportToPdf } from "@/application/export/pdf-writer";
import { pdfExporter } from "@/application/export/exporters/pdf-exporter";
import { samplePackage } from "./package-fixture";

const asLatin1 = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => String.fromCharCode(b)).join("");

describe("renderReportToPdf", () => {
  const bytes = renderReportToPdf(buildReportModel(samplePackage()));
  const text = asLatin1(bytes);

  it("emits a structurally valid, uncompressed PDF", () => {
    expect(text.startsWith("%PDF-1.")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("xref");
    expect(text).toContain("/Root 1 0 R");
    // Uncompressed content streams: no Flate filter.
    expect(text).not.toContain("/Filter");
  });

  it("includes the study title as literal (searchable) text", () => {
    // Study name has a comma; it is drawn as a PDF literal string.
    expect(text).toContain("Study A, cohort 1");
  });
});

describe("pdfExporter", () => {
  it("produces one .pdf file named from the study", () => {
    const files = pdfExporter(samplePackage());
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe("study-a-cohort-1.pdf");
    expect(files[0]?.bytes.length).toBeGreaterThan(500);
  });
});
