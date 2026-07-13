import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import { validateAnnotationFields } from "@/application/use-cases/validate-annotation-input";

describe("validateAnnotationFields", () => {
  it("accepts a valid point and infers the type from geometry", () => {
    const fields = validateAnnotationFields({
      geometry: { kind: "point", x: 0.4, y: 0.6 },
    });
    expect(fields.annotationType).toBe("point");
    expect(fields.geometry).toEqual({ kind: "point", x: 0.4, y: 0.6 });
    expect(fields.label).toBeUndefined();
    expect(fields.notes).toBeUndefined();
  });

  it("accepts a valid rectangle", () => {
    const fields = validateAnnotationFields({
      annotationType: "rectangle",
      geometry: { kind: "rectangle", x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    });
    expect(fields.annotationType).toBe("rectangle");
  });

  it("trims label and notes and drops blanks", () => {
    const fields = validateAnnotationFields({
      geometry: { kind: "point", x: 0, y: 0 },
      label: "  Lesion  ",
      notes: "   ",
    });
    expect(fields.label).toBe("Lesion");
    expect(fields.notes).toBeUndefined();
  });

  it("rejects invalid geometry", () => {
    expect(() =>
      validateAnnotationFields({ geometry: { kind: "point", x: 2, y: 0 } }),
    ).toThrow(ValidationError);
    expect(() => validateAnnotationFields({ geometry: undefined })).toThrow(
      ValidationError,
    );
  });

  it("rejects a type that does not match the geometry", () => {
    expect(() =>
      validateAnnotationFields({
        annotationType: "point",
        geometry: { kind: "rectangle", x: 0, y: 0, width: 0.2, height: 0.2 },
      }),
    ).toThrow(/type doesn't match/i);
  });

  it("rejects an unrecognized type", () => {
    expect(() =>
      validateAnnotationFields({
        annotationType: "polygon",
        geometry: { kind: "point", x: 0, y: 0 },
      }),
    ).toThrow(ValidationError);
  });
});
