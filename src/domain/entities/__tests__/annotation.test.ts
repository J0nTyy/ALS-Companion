import { describe, expect, it } from "vitest";

import {
  ANNOTATION_TYPES,
  annotationTypeForGeometry,
  isAnnotationType,
  isValidAnnotationGeometry,
  parseAnnotationGeometry,
  serializeAnnotationGeometry,
  type AnnotationGeometry,
} from "../annotation";

describe("annotation types", () => {
  it("recognizes the supported types and rejects others", () => {
    expect(ANNOTATION_TYPES).toEqual(["point", "rectangle"]);
    expect(isAnnotationType("point")).toBe(true);
    expect(isAnnotationType("rectangle")).toBe(true);
    expect(isAnnotationType("polygon")).toBe(false);
    expect(isAnnotationType(3)).toBe(false);
    expect(isAnnotationType(undefined)).toBe(false);
  });

  it("derives the type from a geometry's kind", () => {
    expect(annotationTypeForGeometry({ kind: "point", x: 0, y: 0 })).toBe(
      "point",
    );
    expect(
      annotationTypeForGeometry({
        kind: "rectangle",
        x: 0,
        y: 0,
        width: 0.1,
        height: 0.1,
      }),
    ).toBe("rectangle");
  });
});

describe("isValidAnnotationGeometry", () => {
  it("accepts a point with coordinates in [0,1]", () => {
    expect(isValidAnnotationGeometry({ kind: "point", x: 0, y: 1 })).toBe(true);
    expect(isValidAnnotationGeometry({ kind: "point", x: 0.5, y: 0.5 })).toBe(
      true,
    );
  });

  it("rejects a point outside [0,1] or with non-finite coordinates", () => {
    expect(isValidAnnotationGeometry({ kind: "point", x: -0.1, y: 0 })).toBe(
      false,
    );
    expect(isValidAnnotationGeometry({ kind: "point", x: 1.2, y: 0 })).toBe(
      false,
    );
    expect(
      isValidAnnotationGeometry({ kind: "point", x: Number.NaN, y: 0 }),
    ).toBe(false);
    expect(
      isValidAnnotationGeometry({ kind: "point", x: Infinity, y: 0 }),
    ).toBe(false);
  });

  it("accepts a rectangle with positive size that stays inside the image", () => {
    expect(
      isValidAnnotationGeometry({
        kind: "rectangle",
        x: 0.1,
        y: 0.1,
        width: 0.5,
        height: 0.4,
      }),
    ).toBe(true);
    // Flush to the far edges is allowed.
    expect(
      isValidAnnotationGeometry({
        kind: "rectangle",
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      }),
    ).toBe(true);
  });

  it("rejects a rectangle with zero size or one that escapes the image", () => {
    expect(
      isValidAnnotationGeometry({
        kind: "rectangle",
        x: 0,
        y: 0,
        width: 0,
        height: 0.2,
      }),
    ).toBe(false);
    expect(
      isValidAnnotationGeometry({
        kind: "rectangle",
        x: 0.8,
        y: 0,
        width: 0.5,
        height: 0.2,
      }),
    ).toBe(false);
  });

  it("rejects unknown shapes and non-objects", () => {
    expect(isValidAnnotationGeometry({ kind: "polygon" })).toBe(false);
    expect(isValidAnnotationGeometry(null)).toBe(false);
    expect(isValidAnnotationGeometry("point")).toBe(false);
    expect(isValidAnnotationGeometry(42)).toBe(false);
  });
});

describe("serialize / parse geometry", () => {
  it("round-trips a point and a rectangle", () => {
    const point: AnnotationGeometry = { kind: "point", x: 0.25, y: 0.75 };
    const rect: AnnotationGeometry = {
      kind: "rectangle",
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4,
    };
    expect(parseAnnotationGeometry(serializeAnnotationGeometry(point))).toEqual(
      point,
    );
    expect(parseAnnotationGeometry(serializeAnnotationGeometry(rect))).toEqual(
      rect,
    );
  });

  it("throws on malformed JSON", () => {
    expect(() => parseAnnotationGeometry("{not json")).toThrow(/valid JSON/);
  });

  it("throws on well-formed JSON that isn't a valid shape", () => {
    expect(() =>
      parseAnnotationGeometry(JSON.stringify({ kind: "point", x: 2, y: 0 })),
    ).toThrow(/valid shape/);
    expect(() =>
      parseAnnotationGeometry(JSON.stringify({ kind: "blob" })),
    ).toThrow(/valid shape/);
  });
});
