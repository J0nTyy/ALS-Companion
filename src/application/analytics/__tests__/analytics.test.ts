import { describe, expect, it } from "vitest";

import {
  computeOverview,
  computeStudyAnalytics,
  studyFilterOptions,
} from "@/application/analytics/analytics";
import {
  animal,
  sampleContents,
  study,
} from "@/application/use-cases/publication/__tests__/fixtures";

describe("computeStudyAnalytics", () => {
  it("summarizes a study's contents deterministically", () => {
    const c = sampleContents();
    const a = computeStudyAnalytics(c);
    expect(a.animals).toBe(2);
    expect(a.timeline.total).toBe(2);
    expect(a.timeline.completed).toBe(2);
    expect(a.timeline.completionPct).toBe(100);
    expect(a.observations.total).toBe(2);
    expect(a.mri.sessions).toBe(1);
    expect(a.histology.sessions).toBe(0);
    expect(a.biomarker.samples).toBe(0);
    expect(a.annotations.total).toBe(2);
    expect(a.annotations.links).toBe(1);
    expect(a.measurements.total).toBe(2);
    // 6 of 7 readiness checks pass (no biomarker results).
    expect(a.publicationReadiness.score).toBe(86);
    // Deterministic.
    expect(computeStudyAnalytics(sampleContents())).toEqual(a);
  });

  it("applies the treatment-group filter across the cascade", () => {
    const c = sampleContents();
    c.animals = [
      animal("a1", { treatmentGroup: "Vehicle" }),
      animal("a2", { treatmentGroup: "Riluzole" }),
    ];
    const all = computeStudyAnalytics(c, {});
    const filtered = computeStudyAnalytics(c, { treatmentGroup: "Vehicle" });
    expect(all.animals).toBe(2);
    expect(filtered.animals).toBe(1);
    // e2 belongs to a2 (Riluzole) so it drops out with its observation.
    expect(filtered.timeline.total).toBeLessThan(all.timeline.total);
  });
});

describe("computeOverview", () => {
  it("counts studies by status and animal distributions", () => {
    const studies = [
      study({ id: "s1", status: "active" }),
      study({ id: "s2", status: "archived" }),
      study({ id: "s3", status: "active" }),
    ];
    const animals = [
      animal("a1", { treatmentGroup: "Vehicle", mutation: "SOD1-G93A" }),
      animal("a2", { treatmentGroup: "Vehicle", mutation: "Wild Type" }),
      animal("a3", { treatmentGroup: "Riluzole", mutation: "SOD1-G93A" }),
    ];
    const o = computeOverview(studies, animals);
    expect(o.studies.total).toBe(3);
    expect(o.studies.active).toBe(2);
    expect(o.studies.archived).toBe(1);
    expect(o.animals.total).toBe(3);
    // Vehicle (2) sorts before Riluzole (1).
    expect(o.animals.byTreatmentGroup[0]).toEqual({ label: "Vehicle", count: 2 });
  });
});

describe("studyFilterOptions", () => {
  it("lists distinct treatment groups and mutations", () => {
    const c = sampleContents();
    c.animals = [
      animal("a1", { treatmentGroup: "Vehicle", mutation: "SOD1-G93A" }),
      animal("a2", { treatmentGroup: "Riluzole", mutation: "SOD1-G93A" }),
    ];
    const opts = studyFilterOptions(c);
    expect(opts.treatmentGroups).toEqual(["Riluzole", "Vehicle"]);
    expect(opts.mutations).toEqual(["SOD1-G93A"]);
  });
});
