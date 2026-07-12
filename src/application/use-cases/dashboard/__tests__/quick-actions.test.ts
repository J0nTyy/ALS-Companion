import { describe, expect, it } from "vitest";

import { resolveQuickActions } from "@/application/use-cases/dashboard/quick-actions";

describe("resolveQuickActions", () => {
  it("always offers the six actions in order", () => {
    expect(resolveQuickActions("s1").map((a) => a.id)).toEqual([
      "new-study",
      "new-animal",
      "record-observation",
      "create-mri-session",
      "compare-mri",
      "search",
    ]);
  });

  it("uses fixed routes for the context-free actions", () => {
    const byId = Object.fromEntries(
      resolveQuickActions("s1").map((a) => [a.id, a.to]),
    );
    expect(byId["new-study"]).toBe("/studies/new");
    expect(byId["compare-mri"]).toBe("/compare");
    expect(byId["search"]).toBe("/search");
  });

  it("points study-scoped actions at the current study when there is one", () => {
    const byId = Object.fromEntries(
      resolveQuickActions("s1").map((a) => [a.id, a.to]),
    );
    expect(byId["new-animal"]).toBe("/studies/s1");
    expect(byId["record-observation"]).toBe("/studies/s1");
    expect(byId["create-mri-session"]).toBe("/studies/s1");
  });

  it("falls back to the studies list when there is no current study", () => {
    const byId = Object.fromEntries(
      resolveQuickActions(null).map((a) => [a.id, a.to]),
    );
    expect(byId["new-animal"]).toBe("/studies");
    expect(byId["record-observation"]).toBe("/studies");
    expect(byId["create-mri-session"]).toBe("/studies");
    // Fixed routes are unaffected.
    expect(byId["new-study"]).toBe("/studies/new");
  });
});
