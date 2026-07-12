import { describe, expect, it } from "vitest";

import type { SearchQuery } from "@/domain/entities/search";
import {
  eligibleTypes,
  hasActiveFilters,
  isActionableQuery,
} from "@/application/use-cases/search/resolve-search-scope";

function query(partial: Partial<SearchQuery> = {}): SearchQuery {
  return { text: "", filters: {}, ...partial };
}

describe("hasActiveFilters", () => {
  it("is false for no filters or only blank values", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ status: "", mutation: "  " })).toBe(false);
  });

  it("is true when any filter carries a value", () => {
    expect(hasActiveFilters({ studyId: "s1" })).toBe(true);
    expect(hasActiveFilters({ dateFrom: "2026-01-01" })).toBe(true);
  });
});

describe("isActionableQuery", () => {
  it("needs text or at least one filter", () => {
    expect(isActionableQuery(query())).toBe(false);
    expect(isActionableQuery(query({ text: "   " }))).toBe(false);
    expect(isActionableQuery(query({ text: "brain" }))).toBe(true);
    expect(isActionableQuery(query({ filters: { mutation: "SOD1" } }))).toBe(
      true,
    );
  });

  it("is not actionable on a bare type scope", () => {
    expect(isActionableQuery(query({ types: ["animal"] }))).toBe(false);
  });
});

describe("eligibleTypes", () => {
  it("returns nothing for an empty query", () => {
    expect(eligibleTypes(query())).toEqual([]);
  });

  it("text alone is eligible for every type in canonical order", () => {
    expect(eligibleTypes(query({ text: "cortex" }))).toEqual([
      "study",
      "animal",
      "protocol_template",
      "timeline_event",
      "mri_session",
      "observation",
      "research_asset",
    ]);
  });

  it("a type scope restricts the eligible set (canonical order preserved)", () => {
    expect(
      eligibleTypes(query({ text: "x", types: ["observation", "study"] })),
    ).toEqual(["study", "observation"]);
  });

  it("entity-specific filters pin the type", () => {
    expect(eligibleTypes(query({ filters: { mutation: "SOD1" } }))).toEqual([
      "animal",
    ]);
    expect(
      eligibleTypes(query({ filters: { treatmentGroup: "Riluzole" } })),
    ).toEqual(["animal"]);
    expect(
      eligibleTypes(query({ filters: { timelineCategory: "mri" } })),
    ).toEqual(["timeline_event"]);
    expect(
      eligibleTypes(query({ filters: { observationType: "body_weight" } })),
    ).toEqual(["observation"]);
    expect(eligibleTypes(query({ filters: { mriModality: "mri" } }))).toEqual([
      "mri_session",
    ]);
    expect(
      eligibleTypes(query({ filters: { researchAssetType: "pdf" } })),
    ).toEqual(["research_asset"]);
  });

  it("status is limited to status-bearing entities", () => {
    expect(eligibleTypes(query({ filters: { status: "completed" } }))).toEqual([
      "study",
      "timeline_event",
      "research_asset",
    ]);
  });

  it("a date range is limited to date-bearing entities (canonical order)", () => {
    expect(
      eligibleTypes(query({ filters: { dateFrom: "2026-01-01" } })),
    ).toEqual(["timeline_event", "mri_session", "observation"]);
  });

  it("animalId reaches an animal and everything under it", () => {
    expect(eligibleTypes(query({ filters: { animalId: "a1" } }))).toEqual([
      "animal",
      "timeline_event",
      "mri_session",
      "observation",
      "research_asset",
    ]);
  });

  it("studyId alone constrains nothing (every entity belongs to a study)", () => {
    expect(eligibleTypes(query({ filters: { studyId: "s1" } }))).toEqual([
      "study",
      "animal",
      "protocol_template",
      "timeline_event",
      "mri_session",
      "observation",
      "research_asset",
    ]);
  });

  it("contradictory filters intersect to nothing", () => {
    expect(
      eligibleTypes(
        query({ filters: { mriModality: "mri", observationType: "motor_score" } }),
      ),
    ).toEqual([]);
    // A date range excludes studies even with a study scope.
    expect(
      eligibleTypes(
        query({ types: ["study"], filters: { dateFrom: "2026-01-01" } }),
      ),
    ).toEqual([]);
  });

  it("a filter still constrains when free text is present", () => {
    expect(
      eligibleTypes(query({ text: "weight", filters: { mutation: "SOD1" } })),
    ).toEqual(["animal"]);
  });
});
