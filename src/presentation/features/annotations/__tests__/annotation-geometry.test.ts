import { describe, expect, it } from "vitest";

import type { Annotation } from "@/domain/entities/annotation";
import {
  clamp01,
  fitContainSize,
  normalizedFromPoint,
  percent,
  pointGeometryAt,
  rectangleFromCorners,
  resizeRectangle,
  resolveSelected,
  translatePoint,
  translateRectangle,
} from "../annotation-geometry";
import type { RectangleGeometry } from "@/domain/entities/annotation";

describe("clamp01", () => {
  it("clamps into [0,1] and maps NaN to 0", () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe("fitContainSize", () => {
  it("is width-limited for an image wider than its container", () => {
    // 2:1 image in a 100x100 box → spans the width, half the height.
    expect(fitContainSize({ width: 100, height: 100 }, { width: 200, height: 100 })).toEqual(
      { width: 100, height: 50 },
    );
  });

  it("is height-limited for an image taller than its container", () => {
    // 1:2 image in a 100x100 box → spans the height, half the width.
    expect(fitContainSize({ width: 100, height: 100 }, { width: 100, height: 200 })).toEqual(
      { width: 50, height: 100 },
    );
  });

  it("returns a zero size for degenerate inputs", () => {
    expect(fitContainSize({ width: 0, height: 100 }, { width: 10, height: 10 })).toEqual(
      { width: 0, height: 0 },
    );
    expect(fitContainSize({ width: 100, height: 100 }, { width: 0, height: 10 })).toEqual(
      { width: 0, height: 0 },
    );
  });

  it("preserves the image aspect ratio at every zoom scale (BUG 1 regression: no stretch)", () => {
    // The viewer lays the content box out at the fit size and applies zoom as a
    // single uniform scale. Multiplying width AND height by the same scale must
    // keep the ratio identical to the image's natural ratio at all zoom levels.
    const natural = { width: 1000, height: 250 }; // 4:1
    const fit = fitContainSize({ width: 800, height: 600 }, natural);
    const naturalRatio = natural.width / natural.height;
    expect(fit.width / fit.height).toBeCloseTo(naturalRatio);
    for (const scale of [1, 1.25, 2, 4, 8]) {
      const w = fit.width * scale;
      const h = fit.height * scale;
      expect(w / h).toBeCloseTo(naturalRatio);
    }
  });
});

describe("normalizedFromPoint", () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  it("maps a screen point into the content box's [0,1] space", () => {
    expect(normalizedFromPoint(rect, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizedFromPoint(rect, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(normalizedFromPoint(rect, 300, 150)).toEqual({ x: 1, y: 1 });
  });

  it("clamps points outside the content box", () => {
    expect(normalizedFromPoint(rect, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(normalizedFromPoint(rect, 1000, 1000)).toEqual({ x: 1, y: 1 });
  });

  it("is safe for a degenerate rect", () => {
    expect(
      normalizedFromPoint({ left: 0, top: 0, width: 0, height: 0 }, 5, 5),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("pointGeometryAt", () => {
  it("builds a clamped point geometry", () => {
    expect(pointGeometryAt(0.3, 0.7)).toEqual({ kind: "point", x: 0.3, y: 0.7 });
    expect(pointGeometryAt(-1, 5)).toEqual({ kind: "point", x: 0, y: 1 });
  });
});

describe("rectangleFromCorners", () => {
  it("normalizes any drag direction to a top-left origin with positive size", () => {
    const fromTopLeft = rectangleFromCorners({ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.4 });
    const fromBottomRight = rectangleFromCorners({ x: 0.5, y: 0.4 }, { x: 0.1, y: 0.1 });
    const expected = {
      kind: "rectangle",
      x: 0.1,
      y: 0.1,
      width: 0.4,
      height: 0.3,
    };
    expect(fromTopLeft.kind).toBe("rectangle");
    expect(fromTopLeft.x).toBeCloseTo(expected.x);
    expect(fromTopLeft.y).toBeCloseTo(expected.y);
    expect(fromTopLeft.width).toBeCloseTo(expected.width);
    expect(fromTopLeft.height).toBeCloseTo(expected.height);
    // Dragging the opposite direction yields the same rectangle.
    expect(fromBottomRight.x).toBeCloseTo(fromTopLeft.x);
    expect(fromBottomRight.width).toBeCloseTo(fromTopLeft.width);
  });

  it("clamps corners into [0,1]", () => {
    const r = rectangleFromCorners({ x: -1, y: -1 }, { x: 2, y: 0.5 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.width).toBe(1);
    expect(r.height).toBeCloseTo(0.5);
  });
});

describe("percent", () => {
  it("renders a clamped CSS percentage", () => {
    expect(percent(0.25)).toBe("25%");
    expect(percent(2)).toBe("100%");
    expect(percent(-1)).toBe("0%");
  });
});

describe("resolveSelected", () => {
  const point = { kind: "point", x: 0.5, y: 0.5 } as const;
  const anns: Annotation[] = [
    {
      id: "a1",
      storedFileId: "f1",
      annotationType: "point",
      geometry: point,
      createdAt: "t",
      updatedAt: "t",
    },
    {
      id: "a2",
      storedFileId: "f1",
      annotationType: "point",
      geometry: point,
      createdAt: "t",
      updatedAt: "t",
    },
  ];

  it("returns the matching annotation", () => {
    expect(resolveSelected(anns, "a2")?.id).toBe("a2");
  });

  it("returns null when nothing is selected", () => {
    expect(resolveSelected(anns, null)).toBeNull();
  });

  it("returns null when the selected id is gone (e.g. after delete)", () => {
    expect(resolveSelected(anns, "missing")).toBeNull();
  });

  it("keeps the selection after the list is refreshed with an edited copy (edit-deselect regression)", () => {
    // After saving a label, the list is re-fetched with a fresh object for the
    // same id. Selection is by id, so the selected mark stays selected and its new
    // value is what the editor shows.
    const edited = { ...anns[1]!, label: "Updated label" };
    const refreshed = [anns[0]!, edited];
    expect(resolveSelected(refreshed, "a2")?.label).toBe("Updated label");
  });
});

describe("translatePoint (drag to move)", () => {
  it("moves by a normalized delta", () => {
    expect(translatePoint({ kind: "point", x: 0.4, y: 0.4 }, 0.1, -0.2)).toEqual({
      kind: "point",
      x: 0.5,
      y: 0.2,
    });
  });
  it("clamps to the image bounds", () => {
    expect(translatePoint({ kind: "point", x: 0.9, y: 0.1 }, 0.5, -0.5)).toEqual({
      kind: "point",
      x: 1,
      y: 0,
    });
  });
});

describe("translateRectangle (drag to move)", () => {
  const rect: RectangleGeometry = {
    kind: "rectangle",
    x: 0.2,
    y: 0.2,
    width: 0.3,
    height: 0.4,
  };
  it("moves without changing size", () => {
    const moved = translateRectangle(rect, 0.1, -0.1);
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.1);
    expect(moved.width).toBeCloseTo(0.3);
    expect(moved.height).toBeCloseTo(0.4);
  });
  it("stops at the edge (body stays fully inside the image)", () => {
    const moved = translateRectangle(rect, 1, 1);
    expect(moved.x).toBeCloseTo(0.7); // 1 - width
    expect(moved.y).toBeCloseTo(0.6); // 1 - height
    expect(moved.width).toBeCloseTo(0.3);
    expect(moved.height).toBeCloseTo(0.4);
  });
});

describe("resizeRectangle (drag a corner)", () => {
  const rect: RectangleGeometry = {
    kind: "rectangle",
    x: 0.2,
    y: 0.2,
    width: 0.4,
    height: 0.4,
  };
  it("resizes from the SE corner, keeping the NW corner fixed", () => {
    const r = resizeRectangle(rect, "se", 0.1, 0.1);
    expect(r.x).toBeCloseTo(0.2);
    expect(r.y).toBeCloseTo(0.2);
    expect(r.width).toBeCloseTo(0.5);
    expect(r.height).toBeCloseTo(0.5);
  });
  it("resizes from the NW corner, keeping the SE corner fixed", () => {
    const r = resizeRectangle(rect, "nw", 0.1, 0.1);
    expect(r.x).toBeCloseTo(0.3);
    expect(r.y).toBeCloseTo(0.3);
    expect(r.width).toBeCloseTo(0.3); // 0.6 - 0.3
    expect(r.height).toBeCloseTo(0.3);
  });
  it("enforces a minimum size even when dragged past the opposite corner", () => {
    const r = resizeRectangle(rect, "se", -1, -1, 0.02);
    expect(r.width).toBeGreaterThanOrEqual(0.02);
    expect(r.height).toBeGreaterThanOrEqual(0.02);
  });
});
