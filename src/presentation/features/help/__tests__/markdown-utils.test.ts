import { describe, expect, it } from "vitest";

import { slugify } from "../markdown-utils";
import { HELP } from "../help-sections";

describe("slugify", () => {
  it("matches GitHub's heading-anchor algorithm (numbers, & , parens)", () => {
    expect(slugify("1. Getting started")).toBe("1-getting-started");
    expect(slugify("3. Dashboard (Home)")).toBe("3-dashboard-home");
    // "&" is dropped but the surrounding spaces remain → a double hyphen.
    expect(slugify("9. MRI & histology sessions")).toBe("9-mri--histology-sessions");
  });

  it("keeps the HELP deep-link ids in sync with the guide headings", () => {
    expect(slugify("2. How your data is organized")).toBe(HELP.dataModel);
    expect(slugify("9. MRI & histology sessions")).toBe(HELP.mriHistology);
    expect(slugify("15. Publication workspace")).toBe(HELP.publication);
    expect(slugify("17. Deleting vs archiving (and where your data lives)")).toBe(
      HELP.deleting,
    );
  });
});
