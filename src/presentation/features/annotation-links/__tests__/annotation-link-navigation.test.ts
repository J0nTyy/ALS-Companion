import { describe, expect, it } from "vitest";

import { animalRouteForContext } from "../annotation-link-navigation";

describe("animalRouteForContext (open linked annotation)", () => {
  it("routes to the linked annotation's animal detail page", () => {
    expect(
      animalRouteForContext({ studyId: "s1", animalId: "an1" }),
    ).toBe("/studies/s1/animals/an1");
  });
});
