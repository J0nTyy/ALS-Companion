import { describe, expect, it } from "vitest";

import { csvExporter } from "@/application/export/exporters/csv-exporter";
import { toCsv } from "@/application/export/csv";
import { samplePackage } from "./package-fixture";

const decode = (bytes?: Uint8Array) => new TextDecoder().decode(bytes);

describe("toCsv escaping", () => {
  it("quotes fields with commas or quotes and doubles embedded quotes", () => {
    const csv = toCsv(["a", "b"], [
      ["plain", "has, comma"],
      ['has "quote"', "ok"],
    ]);
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe("a,b");
    expect(lines[1]).toBe('plain,"has, comma"');
    expect(lines[2]).toBe('"has ""quote""",ok');
  });

  it("quotes fields containing newlines", () => {
    expect(toCsv(["a"], [["line\nbreak"]])).toContain('"line\nbreak"');
  });
});

describe("csvExporter", () => {
  it("produces the six expected dataset files", () => {
    const files = csvExporter(samplePackage());
    expect(files.map((f) => f.name).sort()).toEqual([
      "animals.csv",
      "annotation_links.csv",
      "annotations.csv",
      "measurements.csv",
      "observations.csv",
      "timeline.csv",
    ]);
  });

  it("writes headers and rows, and separates point vs rectangle measurements", () => {
    const files = csvExporter(samplePackage());
    const byName = new Map(files.map((f) => [f.name, decode(f.bytes)]));

    expect(byName.get("animals.csv")?.startsWith("id,animal_identifier,sex,")).toBe(true);
    expect(byName.get("measurements.csv")?.split("\n")[0]).toBe(
      "annotation_id,type,x,y,width,height,area,aspect_ratio",
    );

    const measurementRows = byName.get("measurements.csv")?.trimEnd().split("\n") ?? [];
    // header + 3 annotations (2 points, 1 rectangle)
    expect(measurementRows).toHaveLength(4);
    expect(measurementRows.some((r) => r.startsWith("an3,rectangle,"))).toBe(true);
    expect(measurementRows.some((r) => /^an1,point,/.test(r))).toBe(true);
  });

  it("escapes a comma-containing annotation label", () => {
    const annotations = decode(
      csvExporter(samplePackage()).find((f) => f.name === "annotations.csv")?.bytes,
    );
    expect(annotations).toContain('"Lesion, left"');
  });
});
