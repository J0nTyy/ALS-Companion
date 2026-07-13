import { describe, expect, it } from "vitest";

import { exportPackage } from "@/application/export/export-engine";
import { EXPORT_FORMATS } from "@/application/export/export-types";
import { samplePackage } from "./package-fixture";

describe("exportPackage (ExportEngine)", () => {
  const pkg = samplePackage();

  it("dispatches every format to a non-empty bundle", () => {
    for (const format of EXPORT_FORMATS) {
      const bundle = exportPackage(pkg, format);
      expect(bundle.format).toBe(format);
      expect(bundle.files.length).toBeGreaterThan(0);
      expect(bundle.files.every((f) => f.bytes.length > 0)).toBe(true);
    }
  });

  it("produces a single file for pdf/docx/json and nine for csv", () => {
    expect(exportPackage(pkg, "pdf").files).toHaveLength(1);
    expect(exportPackage(pkg, "docx").files).toHaveLength(1);
    expect(exportPackage(pkg, "json").files).toHaveLength(1);
    expect(exportPackage(pkg, "csv").files).toHaveLength(9);
  });
});
