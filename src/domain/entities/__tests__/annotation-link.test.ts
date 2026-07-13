import { describe, expect, it } from "vitest";

import {
  crossLinkedIds,
  isAnnotationRelationshipType,
  linkPartnerId,
  partnersOf,
  type AnnotationLink,
} from "../annotation-link";

function link(id: string, source: string, target: string): AnnotationLink {
  return {
    id,
    sourceAnnotationId: source,
    targetAnnotationId: target,
    relationshipType: "follow_up",
    createdAt: "t",
  };
}

describe("isAnnotationRelationshipType", () => {
  it("accepts the known types and rejects others", () => {
    expect(isAnnotationRelationshipType("baseline")).toBe(true);
    expect(isAnnotationRelationshipType("follow_up")).toBe(true);
    expect(isAnnotationRelationshipType("related")).toBe(true);
    expect(isAnnotationRelationshipType("sibling")).toBe(false);
    expect(isAnnotationRelationshipType(3)).toBe(false);
  });
});

describe("linkPartnerId", () => {
  it("returns the other endpoint regardless of direction", () => {
    const l = link("l1", "a", "b");
    expect(linkPartnerId(l, "a")).toBe("b");
    expect(linkPartnerId(l, "b")).toBe("a");
    expect(linkPartnerId(l, "c")).toBeNull();
  });
});

describe("partnersOf", () => {
  it("collects unique partners across both directions", () => {
    const links = [link("l1", "a", "b"), link("l2", "c", "a")];
    expect(partnersOf(links, "a").sort()).toEqual(["b", "c"]);
    expect(partnersOf(links, "b")).toEqual(["a"]);
    expect(partnersOf(links, "z")).toEqual([]);
  });
});

describe("crossLinkedIds (comparison highlighting)", () => {
  it("returns ids linked to a partner in the OTHER set (both directions)", () => {
    const left = new Set(["L1", "L2"]);
    const right = new Set(["R1", "R2"]);
    const links = [
      link("l1", "L1", "R1"), // cross-pane → both highlighted
      link("l2", "R2", "L2"), // cross-pane (reversed) → both highlighted
      link("l3", "L1", "L2"), // same-pane → ignored
    ];
    expect(crossLinkedIds(links, left, right)).toEqual(
      new Set(["L1", "R1", "R2", "L2"]),
    );
  });

  it("ignores links whose endpoints aren't both across the two sets", () => {
    const left = new Set(["L1"]);
    const right = new Set(["R1"]);
    const links = [link("l1", "L1", "X"), link("l2", "R1", "Y")];
    expect(crossLinkedIds(links, left, right).size).toBe(0);
  });
});
