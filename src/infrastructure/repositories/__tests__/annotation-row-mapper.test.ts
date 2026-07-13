import { describe, expect, it } from "vitest";

import {
  mapRowToAnnotation,
  type AnnotationRow,
} from "@/infrastructure/repositories/annotation-row-mapper";

const baseRow: AnnotationRow = {
  id: "ann1",
  stored_file_id: "file1",
  annotation_type: "point",
  label: null,
  geometry: JSON.stringify({ kind: "point", x: 0.5, y: 0.5 }),
  notes: null,
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToAnnotation", () => {
  it("maps a point row and omits null label/notes", () => {
    expect(mapRowToAnnotation(baseRow)).toEqual({
      id: "ann1",
      storedFileId: "file1",
      annotationType: "point",
      geometry: { kind: "point", x: 0.5, y: 0.5 },
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("maps a rectangle row and includes trimmed label/notes", () => {
    const annotation = mapRowToAnnotation({
      ...baseRow,
      annotation_type: "rectangle",
      geometry: JSON.stringify({
        kind: "rectangle",
        x: 0.1,
        y: 0.1,
        width: 0.3,
        height: 0.2,
      }),
      label: "  Cortex  ",
      notes: "  thinning ",
    });
    expect(annotation.geometry).toEqual({
      kind: "rectangle",
      x: 0.1,
      y: 0.1,
      width: 0.3,
      height: 0.2,
    });
    expect(annotation.label).toBe("Cortex");
    expect(annotation.notes).toBe("thinning");
  });

  it("throws on an unrecognized type", () => {
    expect(() =>
      mapRowToAnnotation({ ...baseRow, annotation_type: "polygon" }),
    ).toThrow();
  });

  it("throws on malformed or invalid geometry", () => {
    expect(() =>
      mapRowToAnnotation({ ...baseRow, geometry: "{not json" }),
    ).toThrow();
    expect(() =>
      mapRowToAnnotation({
        ...baseRow,
        geometry: JSON.stringify({ kind: "point", x: 5, y: 0 }),
      }),
    ).toThrow();
  });

  it("throws when the type disagrees with the geometry", () => {
    expect(() =>
      mapRowToAnnotation({
        ...baseRow,
        annotation_type: "rectangle",
        geometry: JSON.stringify({ kind: "point", x: 0.5, y: 0.5 }),
      }),
    ).toThrow(/does not match/);
  });
});
