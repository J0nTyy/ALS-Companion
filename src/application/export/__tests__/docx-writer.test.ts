import { describe, expect, it } from "vitest";

import { buildReportModel } from "@/application/export/report-model";
import { renderReportToDocx } from "@/application/export/docx-writer";
import { docxExporter } from "@/application/export/exporters/docx-exporter";
import { samplePackage } from "./package-fixture";

const asLatin1 = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => String.fromCharCode(b)).join("");

describe("renderReportToDocx", () => {
  const bytes = renderReportToDocx(buildReportModel(samplePackage()));
  const raw = asLatin1(bytes);

  it("produces a ZIP (PK signature) OOXML package", () => {
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
    // STORE method (no compression) → XML part names + content are literal.
    expect(raw).toContain("[Content_Types].xml");
    expect(raw).toContain("word/document.xml");
    expect(raw).toContain("_rels/.rels");
  });

  it("embeds the report content (heading + a table) in document.xml", () => {
    expect(raw).toContain("<w:document");
    expect(raw).toContain("<w:tbl>");
    // Study title text present (XML-escaped, but the comma survives).
    expect(raw).toContain("Study A, cohort 1");
  });
});

describe("docxExporter", () => {
  it("produces one .docx file named from the study", () => {
    const files = docxExporter(samplePackage());
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe("study-a-cohort-1.docx");
    expect(files[0]?.bytes.length).toBeGreaterThan(500);
  });
});
