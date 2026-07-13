import { describe, expect, it } from "vitest";

import {
  emptySelection,
  fullSelection,
  isSelected,
  selectionSize,
  setSectionSelection,
  toggleSelection,
} from "@/application/use-cases/publication/workspace-selection";
import { sampleContents } from "./fixtures";

describe("fullSelection / emptySelection", () => {
  it("fullSelection selects every id in the study", () => {
    const sel = fullSelection(sampleContents());
    expect(sel.animalIds).toEqual(["a1", "a2"]);
    expect(sel.timelineEventIds).toEqual(["e1", "e2"]);
    expect(sel.observationIds).toEqual(["o1", "o2"]);
    expect(sel.mriSessionIds).toEqual(["m1"]);
    expect(sel.researchAssetIds).toEqual(["r1", "r2"]);
    expect(selectionSize(sel)).toBe(9);
  });

  it("emptySelection selects nothing", () => {
    expect(selectionSize(emptySelection())).toBe(0);
  });
});

describe("toggleSelection", () => {
  it("adds then removes an id in a section", () => {
    let sel = emptySelection();
    sel = toggleSelection(sel, "animalIds", "a1");
    expect(isSelected(sel, "animalIds", "a1")).toBe(true);
    sel = toggleSelection(sel, "animalIds", "a1");
    expect(isSelected(sel, "animalIds", "a1")).toBe(false);
  });

  it("only affects the targeted section", () => {
    const sel = toggleSelection(fullSelection(sampleContents()), "animalIds", "a1");
    expect(sel.animalIds).toEqual(["a2"]);
    expect(sel.observationIds).toEqual(["o1", "o2"]); // untouched
  });
});

describe("setSectionSelection", () => {
  it("replaces a section wholesale (select-all / clear)", () => {
    let sel = fullSelection(sampleContents());
    sel = setSectionSelection(sel, "observationIds", []);
    expect(sel.observationIds).toEqual([]);
    sel = setSectionSelection(sel, "observationIds", ["o2"]);
    expect(sel.observationIds).toEqual(["o2"]);
  });
});
