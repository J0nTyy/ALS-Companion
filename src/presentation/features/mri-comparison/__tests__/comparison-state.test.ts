import { describe, expect, it } from "vitest";

import { IDENTITY_TRANSFORM } from "@/presentation/features/storage/image-transform";
import {
  comparisonReducer,
  INITIAL_COMPARISON_STATE,
  isSyncBoth,
  shortcutAction,
  type ComparisonState,
} from "@/presentation/features/mri-comparison/comparison-state";

const base = (over: Partial<ComparisonState> = {}): ComparisonState => ({
  ...INITIAL_COMPARISON_STATE,
  ...over,
});

describe("comparisonReducer — zoom", () => {
  it("zooms only the acted side when zoom sync is off", () => {
    const next = comparisonReducer(base(), {
      type: "zoom",
      side: "left",
      factor: 2,
    });
    expect(next.left.scale).toBe(2);
    expect(next.right.scale).toBe(1);
  });

  it("mirrors the zoom factor to the other side when zoom sync is on", () => {
    const next = comparisonReducer(base({ sync: { zoom: true, pan: false } }), {
      type: "zoom",
      side: "left",
      factor: 2,
    });
    expect(next.left.scale).toBe(2);
    expect(next.right.scale).toBe(2);
  });

  it("pan sync does not mirror a zoom", () => {
    const next = comparisonReducer(base({ sync: { zoom: false, pan: true } }), {
      type: "zoom",
      side: "right",
      factor: 2,
    });
    expect(next.right.scale).toBe(2);
    expect(next.left.scale).toBe(1);
  });
});

describe("comparisonReducer — pan", () => {
  it("pans only the acted side when pan sync is off", () => {
    const next = comparisonReducer(base(), {
      type: "pan",
      side: "left",
      dx: 10,
      dy: -5,
    });
    expect(next.left.offset).toEqual({ x: 10, y: -5 });
    expect(next.right.offset).toEqual({ x: 0, y: 0 });
  });

  it("mirrors the pan delta to the other side when pan sync is on", () => {
    const next = comparisonReducer(base({ sync: { zoom: false, pan: true } }), {
      type: "pan",
      side: "left",
      dx: 10,
      dy: -5,
    });
    expect(next.left.offset).toEqual({ x: 10, y: -5 });
    expect(next.right.offset).toEqual({ x: 10, y: -5 });
  });
});

describe("comparisonReducer — reset/fit", () => {
  const zoomed = base({
    left: { scale: 4, offset: { x: 3, y: 3 } },
    right: { scale: 2, offset: { x: 1, y: 1 } },
    sync: { zoom: true, pan: false },
  });

  it("reset of one side mirrors to the other when any sync is on", () => {
    const next = comparisonReducer(zoomed, { type: "reset", side: "left" });
    expect(next.left).toEqual(IDENTITY_TRANSFORM);
    expect(next.right).toEqual(IDENTITY_TRANSFORM);
  });

  it("reset of one side is independent when no sync is on", () => {
    const noSync = base({
      left: { scale: 4, offset: { x: 3, y: 3 } },
      right: { scale: 2, offset: { x: 1, y: 1 } },
    });
    const next = comparisonReducer(noSync, { type: "fit", side: "left" });
    expect(next.left).toEqual(IDENTITY_TRANSFORM);
    expect(next.right.scale).toBe(2);
  });

  it("resetBoth / fitBoth identity both sides and keep sync settings", () => {
    const next = comparisonReducer(zoomed, { type: "resetBoth" });
    expect(next.left).toEqual(IDENTITY_TRANSFORM);
    expect(next.right).toEqual(IDENTITY_TRANSFORM);
    expect(next.sync).toEqual({ zoom: true, pan: false });
  });
});

describe("comparisonReducer — sync settings", () => {
  it("toggles zoom and pan independently", () => {
    let s = comparisonReducer(base(), { type: "toggleSyncZoom" });
    expect(s.sync).toEqual({ zoom: true, pan: false });
    s = comparisonReducer(s, { type: "toggleSyncPan" });
    expect(s.sync).toEqual({ zoom: true, pan: true });
  });

  it("setSyncBoth turns both on or off", () => {
    const on = comparisonReducer(base(), { type: "setSyncBoth", on: true });
    expect(on.sync).toEqual({ zoom: true, pan: true });
    const off = comparisonReducer(on, { type: "setSyncBoth", on: false });
    expect(off.sync).toEqual({ zoom: false, pan: false });
  });

  it("isSyncBoth is true only when both are on", () => {
    expect(isSyncBoth({ zoom: true, pan: true })).toBe(true);
    expect(isSyncBoth({ zoom: true, pan: false })).toBe(false);
    expect(isSyncBoth({ zoom: false, pan: false })).toBe(false);
  });
});

describe("shortcutAction", () => {
  it("maps R/F/Z/P (any case) and ignores everything else", () => {
    expect(shortcutAction("r")).toEqual({ type: "resetBoth" });
    expect(shortcutAction("F")).toEqual({ type: "fitBoth" });
    expect(shortcutAction("z")).toEqual({ type: "toggleSyncZoom" });
    expect(shortcutAction("P")).toEqual({ type: "toggleSyncPan" });
    expect(shortcutAction("a")).toBeNull();
    expect(shortcutAction("Enter")).toBeNull();
  });
});
