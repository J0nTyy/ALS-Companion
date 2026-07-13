import { describe, expect, it } from "vitest";

import { assemblePackage } from "@/application/use-cases/publication/assemble-package";
import {
  emptySelection,
  fullSelection,
} from "@/application/use-cases/publication/workspace-selection";
import { sampleContents } from "./fixtures";

describe("assemblePackage", () => {
  it("includes everything under a full selection", () => {
    const c = sampleContents();
    const pkg = assemblePackage(c, fullSelection(c));
    expect(pkg.animals).toHaveLength(2);
    expect(pkg.timelineEvents).toHaveLength(2);
    expect(pkg.observations).toHaveLength(2);
    expect(pkg.mriSessions).toHaveLength(1);
    expect(pkg.researchAssets).toHaveLength(2);
    expect(pkg.storedFiles).toHaveLength(2);
  });

  it("always includes study metadata and the protocol, regardless of selection", () => {
    const c = sampleContents();
    const pkg = assemblePackage(c, emptySelection());
    expect(pkg.study.id).toBe("s1");
    expect(pkg.protocol?.steps).toHaveLength(2);
    expect(pkg.animals).toEqual([]);
  });

  it("filters entities to exactly what is selected", () => {
    const c = sampleContents();
    const pkg = assemblePackage(c, {
      animalIds: ["a1"],
      timelineEventIds: ["e1"],
      observationIds: [],
      mriSessionIds: ["m1"],
      histologySessionIds: [],
      biomarkerSampleIds: [],
      researchAssetIds: ["r1"],
    });
    expect(pkg.animals.map((a) => a.id)).toEqual(["a1"]);
    expect(pkg.timelineEvents.map((e) => e.id)).toEqual(["e1"]);
    expect(pkg.observations).toEqual([]);
    expect(pkg.researchAssets.map((r) => r.id)).toEqual(["r1"]);
  });

  it("includes a stored file only when its research asset is selected", () => {
    const c = sampleContents(); // f1→r1, f2→r2
    const pkg = assemblePackage(c, {
      ...emptySelection(),
      researchAssetIds: ["r1"],
    });
    expect(pkg.storedFiles.map((f) => f.id)).toEqual(["f1"]);
  });

  it("includes annotations + derived measurements for included images", () => {
    const c = sampleContents(); // an1 on f1(r1), an2 on f2(r2), linked
    const pkg = assemblePackage(c, fullSelection(c));
    expect(pkg.annotations.map((a) => a.id).sort()).toEqual(["an1", "an2"]);
    expect(pkg.measurements.map((m) => m.annotationId).sort()).toEqual([
      "an1",
      "an2",
    ]);
    expect(pkg.annotationLinks.map((l) => l.id)).toEqual(["ln1"]);
  });

  it("drops a link when only one of its annotations is included", () => {
    const c = sampleContents();
    const pkg = assemblePackage(c, {
      ...fullSelection(c),
      researchAssetIds: ["r1"], // only f1 → only an1; an2 (on f2) excluded
    });
    expect(pkg.annotations.map((a) => a.id)).toEqual(["an1"]);
    // ln1 links an1↔an2, but an2 isn't included → the link is dropped.
    expect(pkg.annotationLinks).toEqual([]);
  });
});
