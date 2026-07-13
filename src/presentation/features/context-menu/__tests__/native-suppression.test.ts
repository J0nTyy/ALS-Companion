import { describe, expect, it } from "vitest";

import { isEditableTarget } from "../native-suppression";

describe("isEditableTarget (browser context-menu suppression)", () => {
  it("treats inputs, textareas, and selects as editable (native menu allowed)", () => {
    expect(isEditableTarget({ tagName: "INPUT", isContentEditable: false })).toBe(true);
    expect(isEditableTarget({ tagName: "TEXTAREA", isContentEditable: false })).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT", isContentEditable: false })).toBe(true);
  });

  it("treats a contenteditable element as editable regardless of tag", () => {
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("treats ordinary elements as non-editable (browser menu suppressed)", () => {
    expect(isEditableTarget({ tagName: "DIV", isContentEditable: false })).toBe(false);
    expect(isEditableTarget({ tagName: "BUTTON", isContentEditable: false })).toBe(false);
    expect(isEditableTarget({ tagName: "IMG", isContentEditable: false })).toBe(false);
  });

  it("is case-insensitive on the tag name", () => {
    expect(isEditableTarget({ tagName: "input", isContentEditable: false })).toBe(true);
  });

  it("is safe for a null target", () => {
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
  });
});
