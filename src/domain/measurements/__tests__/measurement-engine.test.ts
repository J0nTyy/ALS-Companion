import { describe, expect, it } from "vitest";

import type { Annotation } from "@/domain/entities/annotation";
import {
  inspectAnnotation,
  measureAnnotation,
  type ImageDimensions,
  type RectangleMeasurement,
} from "../measurement-engine";

const IMAGE: ImageDimensions = { width: 1000, height: 500 };

describe("measureAnnotation — point", () => {
  it("returns normalized coordinates and pixels when image dimensions are given", () => {
    const m = measureAnnotation({ kind: "point", x: 0.25, y: 0.75 }, IMAGE);
    expect(m.kind).toBe("point");
    if (m.kind !== "point") throw new Error("expected point");
    expect(m.normalized).toEqual({ x: 0.25, y: 0.75 });
    expect(m.pixels).not.toBeNull();
    expect(m.pixels?.x).toBeCloseTo(250);
    expect(m.pixels?.y).toBeCloseTo(375);
  });

  it("returns normalized only (pixels null) when image dimensions are unavailable", () => {
    expect(measureAnnotation({ kind: "point", x: 0.4, y: 0.6 }).pixels).toBeNull();
    expect(
      measureAnnotation({ kind: "point", x: 0.4, y: 0.6 }, null).pixels,
    ).toBeNull();
    // Degenerate image dimensions are treated as unavailable (never fabricated).
    expect(
      measureAnnotation({ kind: "point", x: 0.4, y: 0.6 }, { width: 0, height: 500 })
        .pixels,
    ).toBeNull();
  });
});

describe("measureAnnotation — rectangle", () => {
  const geometry = {
    kind: "rectangle" as const,
    x: 0.1,
    y: 0.2,
    width: 0.4,
    height: 0.3,
  };

  function rect(image?: ImageDimensions | null): RectangleMeasurement {
    const m = measureAnnotation(geometry, image);
    if (m.kind !== "rectangle") throw new Error("expected rectangle");
    return m;
  }

  it("computes normalized corners, center, and size", () => {
    const m = rect(IMAGE);
    expect(m.normalized.topLeft).toEqual({ x: 0.1, y: 0.2 });
    expect(m.normalized.bottomRight.x).toBeCloseTo(0.5);
    expect(m.normalized.bottomRight.y).toBeCloseTo(0.5);
    expect(m.normalized.center.x).toBeCloseTo(0.3);
    expect(m.normalized.center.y).toBeCloseTo(0.35);
    expect(m.normalized.width).toBeCloseTo(0.4);
    expect(m.normalized.height).toBeCloseTo(0.3);
  });

  it("converts to pixels: width, height, area, perimeter, corners, center", () => {
    const px = rect(IMAGE).pixels;
    expect(px).not.toBeNull();
    expect(px?.width).toBeCloseTo(400); // 0.4 * 1000
    expect(px?.height).toBeCloseTo(150); // 0.3 * 500
    expect(px?.area).toBeCloseTo(60000); // 400 * 150
    expect(px?.perimeter).toBeCloseTo(1100); // 2 * (400 + 150)
    expect(px?.topLeft).toEqual({ x: 100, y: 100 });
    expect(px?.bottomRight.x).toBeCloseTo(500);
    expect(px?.bottomRight.y).toBeCloseTo(250);
    expect(px?.center.x).toBeCloseTo(300);
    expect(px?.center.y).toBeCloseTo(175);
  });

  it("aspect ratio uses pixels when available (true ROI aspect)", () => {
    expect(rect(IMAGE).aspectRatio).toBeCloseTo(400 / 150); // ≈ 2.667
  });

  it("aspect ratio falls back to normalized dims when no image", () => {
    const m = rect(null);
    expect(m.pixels).toBeNull();
    expect(m.aspectRatio).toBeCloseTo(0.4 / 0.3); // ≈ 1.333
  });

  it("returns normalized values only when image dimensions are unavailable", () => {
    const m = rect(null);
    expect(m.normalized.width).toBeCloseTo(0.4);
    expect(m.pixels).toBeNull();
  });
});

describe("inspectAnnotation — empty state and switching", () => {
  const point: Annotation = {
    id: "a1",
    storedFileId: "f1",
    annotationType: "point",
    geometry: { kind: "point", x: 0.5, y: 0.5 },
    createdAt: "t",
    updatedAt: "t",
  };
  const rectangle: Annotation = {
    id: "a2",
    storedFileId: "f1",
    annotationType: "rectangle",
    geometry: { kind: "rectangle", x: 0, y: 0, width: 0.5, height: 0.5 },
    createdAt: "t",
    updatedAt: "t",
  };

  it("returns null when nothing is selected (inspector empty state)", () => {
    expect(inspectAnnotation(null)).toBeNull();
    expect(inspectAnnotation(null, IMAGE)).toBeNull();
  });

  it("switches result shape with the selected annotation", () => {
    expect(inspectAnnotation(point, IMAGE)?.kind).toBe("point");
    expect(inspectAnnotation(rectangle, IMAGE)?.kind).toBe("rectangle");
  });

  it("recomputes deterministically for the same input", () => {
    expect(inspectAnnotation(rectangle, IMAGE)).toEqual(
      inspectAnnotation(rectangle, IMAGE),
    );
  });
});
