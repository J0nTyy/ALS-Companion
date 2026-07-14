import { describe, expect, it } from "vitest";

import { buildReportModel } from "@/application/export/report-model";
import { renderReportToDocx } from "@/application/export/docx-writer";
import { docxExporter } from "@/application/export/exporters/docx-exporter";
import type { ReportImages } from "@/application/export/export-types";
import { samplePackage } from "./package-fixture";

describe("renderReportToDocx", () => {
  it("produces a ZIP (PK signature) OOXML package", async () => {
    const bytes = await renderReportToDocx(buildReportModel(samplePackage()));
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("honours page size + footer options without failing", async () => {
    const bytes = await renderReportToDocx(buildReportModel(samplePackage()), undefined, {
      pageSize: "a4",
      coverPage: true,
      headerFooter: true,
      institution: "Dept. of Neurology",
    });
    expect(bytes[0]).toBe(0x50);
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("grows the package when an image is embedded", async () => {
    // The sample package references PNG stored files (images/f1.png …).
    const images: ReportImages = new Map([
      [
        "images/f1.png",
        { bytes: new Uint8Array(2048).fill(200), mimeType: "image/png", width: 800, height: 600 },
      ],
    ]);
    const withImage = await renderReportToDocx(buildReportModel(samplePackage()), images);
    const withoutImage = await renderReportToDocx(buildReportModel(samplePackage()));
    expect(withImage.length).toBeGreaterThan(withoutImage.length);
  });
});

describe("docxExporter", () => {
  it("produces one .docx file named from the study", async () => {
    const files = await docxExporter(samplePackage());
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe("study-a-cohort-1.docx");
    expect(files[0]?.bytes.length).toBeGreaterThan(500);
  });
});
