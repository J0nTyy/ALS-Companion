import { describe, expect, it } from "vitest";

import {
  mapRowToAnnotationLink,
  type AnnotationLinkRow,
} from "@/infrastructure/repositories/annotation-link-row-mapper";

const baseRow: AnnotationLinkRow = {
  id: "l1",
  source_annotation_id: "a1",
  target_annotation_id: "a2",
  relationship_type: "follow_up",
  notes: null,
  created_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToAnnotationLink", () => {
  it("maps a row and omits a null note", () => {
    expect(mapRowToAnnotationLink(baseRow)).toEqual({
      id: "l1",
      sourceAnnotationId: "a1",
      targetAnnotationId: "a2",
      relationshipType: "follow_up",
      createdAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("includes and trims a populated note", () => {
    expect(
      mapRowToAnnotationLink({ ...baseRow, notes: "  grew larger " }).notes,
    ).toBe("grew larger");
  });

  it("throws on an unrecognized relationship type", () => {
    expect(() =>
      mapRowToAnnotationLink({ ...baseRow, relationship_type: "sibling" }),
    ).toThrow();
  });
});
