import { describe, expect, it } from "vitest";

import type { ComparableSession } from "@/application/ports/mri-comparison-reader";
import {
  comparisonMetadataRows,
  resolveSelection,
  sessionPickerLabel,
} from "@/presentation/features/mri-comparison/comparison-selection";

function session(over: Partial<ComparableSession> = {}): ComparableSession {
  return {
    sessionId: "m1",
    title: "Baseline brain",
    modality: "mri",
    acquisitionDate: "2026-07-10",
    studyId: "s1",
    studyName: "SOD1 cohort",
    animalId: "a1",
    animalIdentifier: "M-12",
    timelineEventId: "t1",
    timelineEventTitle: "Baseline MRI",
    image: {
      storedFileId: "f1",
      relativePath: "images/f1.png",
      originalName: "scan.png",
      mimeType: "image/png",
    },
    ...over,
  };
}

describe("resolveSelection", () => {
  const s1 = session({ sessionId: "m1" });
  const s2 = session({ sessionId: "m2", title: "Follow-up" });

  it("resolves both sides and flags readiness", () => {
    const sel = resolveSelection([s1, s2], "m1", "m2");
    expect(sel.left?.sessionId).toBe("m1");
    expect(sel.right?.sessionId).toBe("m2");
    expect(sel.ready).toBe(true);
    expect(sel.sameSession).toBe(false);
  });

  it("is not ready until both sides are chosen", () => {
    expect(resolveSelection([s1], null, "m1").ready).toBe(false);
    expect(resolveSelection([s1], "m1", null).ready).toBe(false);
    expect(resolveSelection([s1], "m1", "missing").ready).toBe(false);
  });

  it("flags when both sides are the same session", () => {
    const sel = resolveSelection([s1], "m1", "m1");
    expect(sel.ready).toBe(true);
    expect(sel.sameSession).toBe(true);
  });
});

describe("comparisonMetadataRows", () => {
  it("lists the metadata in the required order", () => {
    expect(comparisonMetadataRows(session()).map((r) => r.label)).toEqual([
      "Study",
      "Animal",
      "Timeline event",
      "Acquisition date",
      "Region",
      "Operator",
      "File",
      "Image type",
    ]);
  });

  it("maps values and the image type label", () => {
    const byLabel = Object.fromEntries(
      comparisonMetadataRows(session()).map((r) => [r.label, r]),
    );
    expect(byLabel.Study?.value).toBe("SOD1 cohort");
    expect(byLabel.Animal?.value).toBe("M-12");
    expect(byLabel["Timeline event"]?.value).toBe("Baseline MRI");
    expect(byLabel.File?.value).toBe("scan.png");
    expect(byLabel["Image type"]?.value).toBe("PNG");
  });

  it("marks absent region/operator as muted, and shows them when present", () => {
    const absent = Object.fromEntries(
      comparisonMetadataRows(session()).map((r) => [r.label, r]),
    );
    expect(absent.Region?.muted).toBe(true);
    expect(absent.Operator?.muted).toBe(true);

    const present = Object.fromEntries(
      comparisonMetadataRows(
        session({ region: "Brain", operator: "Sam" }),
      ).map((r) => [r.label, r]),
    );
    expect(present.Region?.value).toBe("Brain");
    expect(present.Region?.muted).toBe(false);
    expect(present.Operator?.value).toBe("Sam");
  });
});

describe("sessionPickerLabel", () => {
  it("combines animal, title, and date", () => {
    const label = sessionPickerLabel(session());
    expect(label).toContain("M-12");
    expect(label).toContain("Baseline brain");
    expect(label.split(" · ")).toHaveLength(3);
  });
});
