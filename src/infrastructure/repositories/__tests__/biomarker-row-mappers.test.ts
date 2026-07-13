import { describe, expect, it } from "vitest";

import {
  mapRowToBiomarkerSample,
  type BiomarkerSampleRow,
} from "@/infrastructure/repositories/biomarker-sample-row-mapper";
import {
  mapRowToBiomarkerResult,
  type BiomarkerResultRow,
} from "@/infrastructure/repositories/biomarker-result-row-mapper";

const sampleRow: BiomarkerSampleRow = {
  id: "bs1",
  timeline_event_id: "tl1",
  sample_type: "csf",
  collection_date: "2026-07-11",
  operator: null,
  notes: null,
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
};

const resultRow: BiomarkerResultRow = {
  id: "br1",
  biomarker_sample_id: "bs1",
  biomarker_name: "Neurofilament Light (NfL)",
  value: "45.2",
  unit: null,
  method: null,
  notes: null,
  created_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToBiomarkerSample", () => {
  it("maps a row and omits null optionals", () => {
    expect(mapRowToBiomarkerSample(sampleRow)).toEqual({
      id: "bs1",
      timelineEventId: "tl1",
      sampleType: "csf",
      collectionDate: "2026-07-11",
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("trims populated optionals", () => {
    const sample = mapRowToBiomarkerSample({
      ...sampleRow,
      operator: "  Sam ",
      notes: "  fasting ",
    });
    expect(sample.operator).toBe("Sam");
    expect(sample.notes).toBe("fasting");
  });

  it("throws on an unknown sample type or invalid collection date", () => {
    expect(() =>
      mapRowToBiomarkerSample({ ...sampleRow, sample_type: "plasma" }),
    ).toThrow();
    expect(() =>
      mapRowToBiomarkerSample({ ...sampleRow, collection_date: "2026-02-30" }),
    ).toThrow();
  });
});

describe("mapRowToBiomarkerResult", () => {
  it("maps a row and omits null optionals", () => {
    expect(mapRowToBiomarkerResult(resultRow)).toEqual({
      id: "br1",
      biomarkerSampleId: "bs1",
      biomarkerName: "Neurofilament Light (NfL)",
      value: "45.2",
      createdAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("preserves a qualitative value verbatim and trims optionals", () => {
    const result = mapRowToBiomarkerResult({
      ...resultRow,
      value: "< 0.05",
      unit: "  pg/mL ",
      method: "  ELISA ",
    });
    expect(result.value).toBe("< 0.05");
    expect(result.unit).toBe("pg/mL");
    expect(result.method).toBe("ELISA");
  });

  it("throws on an empty biomarker name or empty value", () => {
    expect(() =>
      mapRowToBiomarkerResult({ ...resultRow, biomarker_name: "  " }),
    ).toThrow();
    expect(() =>
      mapRowToBiomarkerResult({ ...resultRow, value: "  " }),
    ).toThrow();
  });
});
