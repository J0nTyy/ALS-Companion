import { describe, expect, it } from "vitest";

import { assemblePackage } from "@/application/use-cases/publication/assemble-package";
import { previewPackage } from "@/application/use-cases/publication/package-preview";
import { fullSelection } from "@/application/use-cases/publication/workspace-selection";
import type { WorkspaceStudyContents } from "@/application/use-cases/publication/publication-package";
import { toJsonDocument } from "@/application/export/exporters/json-exporter";
import { csvExporter } from "@/application/export/exporters/csv-exporter";
import { buildReportModel } from "@/application/export/report-model";
import {
  annotation,
  asset,
  event,
  file,
  histologySession,
  sampleContents,
} from "./fixtures";

/**
 * A study whose histology session carries its own research asset, stored file, and
 * annotation — added on top of the shared MRI-centric sample. Exercises the whole
 * v1.9 flow: histology flows through selection → package → JSON/CSV/report exports.
 */
function contentsWithHistology(): WorkspaceStudyContents {
  const c = sampleContents();
  return {
    ...c,
    timelineEvents: [
      ...c.timelineEvents,
      event("eH", "a1", { category: "histopathology" }),
    ],
    histologySessions: [
      histologySession("h1", "eH", { stain: "gfap", tissue: "Spinal cord" }),
    ],
    researchAssets: [
      ...c.researchAssets,
      asset("rH", "h1", {
        ownerType: "histology_session",
        assetType: "histology_image",
        title: "GFAP slide",
      }),
    ],
    storedFiles: [...c.storedFiles, file("fH", "rH")],
    annotations: [
      ...c.annotations,
      annotation("anH", "fH", { label: "Gliosis focus" }),
    ],
  };
}

const decode = (bytes?: Uint8Array) => new TextDecoder().decode(bytes);

describe("histology flows through the publication package", () => {
  const contents = contentsWithHistology();
  const pkg = assemblePackage(contents, fullSelection(contents));

  it("includes the selected histology session and its asset/file/annotation", () => {
    expect(pkg.histologySessions.map((h) => h.id)).toEqual(["h1"]);
    // The histology research asset (and thus its file + annotation) come along.
    expect(pkg.researchAssets.some((r) => r.id === "rH")).toBe(true);
    expect(pkg.storedFiles.some((f) => f.id === "fH")).toBe(true);
    expect(pkg.annotations.some((a) => a.id === "anH")).toBe(true);
  });

  it("counts histology sessions in the preview", () => {
    const preview = previewPackage(pkg);
    const byKey = Object.fromEntries(
      preview.sections.map((s) => [s.key, s.count]),
    );
    expect(byKey.histologySessions).toBe(1);
  });

  it("excludes a histology session that is not selected", () => {
    const selection = { ...fullSelection(contents), histologySessionIds: [] };
    const filtered = assemblePackage(contents, selection);
    expect(filtered.histologySessions).toHaveLength(0);
  });
});

describe("histology appears in every export format", () => {
  const contents = contentsWithHistology();
  const pkg = assemblePackage(contents, fullSelection(contents));

  it("JSON carries a histologySessions array", () => {
    const doc = toJsonDocument(pkg) as Record<string, unknown>;
    expect((doc.histologySessions as unknown[]).length).toBe(1);
  });

  it("CSV emits a histology_sessions.csv with a data row", () => {
    const files = csvExporter(pkg);
    const histology = files.find((f) => f.name === "histology_sessions.csv");
    expect(histology).toBeDefined();
    const text = decode(histology?.bytes);
    expect(text.split("\n")[0]).toBe(
      "id,timeline_event_id,stain,tissue,magnification,acquisition_date,operator,notes",
    );
    expect(text).toContain("h1,eH,gfap,Spinal cord");
  });

  it("the report model includes a Histology sessions table row", () => {
    const doc = buildReportModel(pkg);
    const section = doc.sections.find((s) => s.heading === "Histology sessions");
    const table = section?.blocks.find((b) => b.kind === "table");
    expect(table?.kind).toBe("table");
    if (table?.kind === "table") {
      expect(table.rows).toHaveLength(1);
      // Rendered with the human label, not the raw key.
      expect(table.rows[0]).toContain("GFAP");
    }
  });
});
