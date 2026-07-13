import { describe, expect, it } from "vitest";

import { shouldClearSelection } from "../annotation-interaction";

describe("shouldClearSelection (BUG 2 regression: selection must not clear on a mark click)", () => {
  it("does NOT clear when the press began on a mark (no background press recorded)", () => {
    // A mark click stops propagation, so the overlay records no background press.
    // The bubbling pointer-up must not wipe the just-made selection.
    expect(shouldClearSelection("select", null)).toBe(false);
  });

  it("clears on an intentional click that began on empty background", () => {
    expect(shouldClearSelection("select", { moved: false })).toBe(true);
  });

  it("does NOT clear when the background press turned into a drag/pan", () => {
    expect(shouldClearSelection("select", { moved: true })).toBe(false);
  });

  it("never clears while a drawing tool is active", () => {
    expect(shouldClearSelection("point", { moved: false })).toBe(false);
    expect(shouldClearSelection("rectangle", { moved: false })).toBe(false);
    expect(shouldClearSelection("point", null)).toBe(false);
  });
});
