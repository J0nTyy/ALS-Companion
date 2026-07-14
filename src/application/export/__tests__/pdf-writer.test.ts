import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import { buildReportModel } from "@/application/export/report-model";
import { renderReportToPdf } from "@/application/export/pdf-writer";
import { pdfExporter } from "@/application/export/exporters/pdf-exporter";
import { samplePackage } from "./package-fixture";

const asLatin1 = (bytes: Uint8Array) =>
  Array.from(bytes.slice(0, 8), (b) => String.fromCharCode(b)).join("");

describe("renderReportToPdf", () => {
  it("emits a valid, loadable PDF", async () => {
    const bytes = await renderReportToPdf(buildReportModel(samplePackage()));
    expect(asLatin1(bytes).startsWith("%PDF-1.")).toBe(true);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("wraps a long title instead of throwing / overflowing", async () => {
    const longTitle =
      "Longitudinal Multi-Cohort Investigation of Neuromuscular Decline in the SOD1-G93A Transgenic Mouse Model of Amyotrophic Lateral Sclerosis — Research Package";
    const bytes = await renderReportToPdf({ title: longTitle, subtitle: "", sections: [] });
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("honours the A4 page size option", async () => {
    const bytes = await renderReportToPdf(buildReportModel(samplePackage()), undefined, {
      pageSize: "a4",
    });
    const loaded = await PDFDocument.load(bytes);
    const { width } = loaded.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
  });

  it("adds a cover page + footer when requested", async () => {
    const base = await renderReportToPdf(buildReportModel(samplePackage()));
    const withCover = await renderReportToPdf(buildReportModel(samplePackage()), undefined, {
      coverPage: true,
      headerFooter: true,
      institution: "Dept. of Neurology",
    });
    const basePages = (await PDFDocument.load(base)).getPageCount();
    const coverPages = (await PDFDocument.load(withCover)).getPageCount();
    expect(coverPages).toBe(basePages + 1);
  });
});

describe("pdfExporter", () => {
  it("produces one .pdf file named from the study", async () => {
    const files = await pdfExporter(samplePackage());
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe("study-a-cohort-1.pdf");
    expect(files[0]?.bytes.length).toBeGreaterThan(500);
  });
});
