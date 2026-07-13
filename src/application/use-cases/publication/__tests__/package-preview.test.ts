import { describe, expect, it } from "vitest";

import { assemblePackage } from "@/application/use-cases/publication/assemble-package";
import { previewPackage } from "@/application/use-cases/publication/package-preview";
import {
  emptySelection,
  fullSelection,
} from "@/application/use-cases/publication/workspace-selection";
import { sampleContents } from "./fixtures";

describe("previewPackage — validation", () => {
  it("warns to select a study when there is no package", () => {
    const preview = previewPackage(null);
    expect(preview.warnings).toEqual([
      "Select a study to start building a package.",
    ]);
    expect(preview.isEmpty).toBe(true);
    expect(preview.sections).toEqual([]);
  });

  it("warns when no animals are selected", () => {
    const c = sampleContents();
    const pkg = assemblePackage(c, {
      ...fullSelection(c),
      animalIds: [],
    });
    const preview = previewPackage(pkg);
    expect(preview.warnings.some((w) => w.includes("No animals selected"))).toBe(
      true,
    );
  });

  it("warns when the package is empty (only study/protocol)", () => {
    const c = sampleContents();
    const preview = previewPackage(assemblePackage(c, emptySelection()));
    expect(preview.isEmpty).toBe(true);
    expect(preview.warnings.some((w) => w.includes("empty"))).toBe(true);
    expect(preview.warnings.some((w) => w.includes("No animals"))).toBe(true);
  });
});

describe("previewPackage — generation", () => {
  it("summarizes section counts and total for a full package", () => {
    const c = sampleContents();
    const preview = previewPackage(assemblePackage(c, fullSelection(c)));

    expect(preview.studyName).toBe("Study A");
    expect(preview.isEmpty).toBe(false);
    expect(preview.warnings).toEqual([]);

    const byKey = Object.fromEntries(
      preview.sections.map((s) => [s.key, s.count]),
    );
    expect(byKey.animals).toBe(2);
    expect(byKey.protocol).toBe(2); // protocol steps
    expect(byKey.timelineEvents).toBe(2);
    expect(byKey.observations).toBe(2);
    expect(byKey.mriSessions).toBe(1);
    expect(byKey.researchAssets).toBe(2);
    expect(byKey.storedFiles).toBe(2);
    expect(byKey.annotations).toBe(2);
    expect(byKey.annotationLinks).toBe(1);
    // total = 2+2+2+2+1+2+2 + annotations(2) + links(1)
    expect(preview.totalItems).toBe(16);
  });
});
