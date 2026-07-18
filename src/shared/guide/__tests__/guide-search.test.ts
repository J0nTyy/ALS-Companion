import { describe, expect, it } from "vitest";

import { parseGuide, searchGuideSections } from "@/shared/guide/guide-search";

const SAMPLE = [
  "# ALS Research Companion — User Guide",
  "",
  "Intro paragraph.",
  "",
  "## Table of Contents",
  "- a",
  "",
  "## 1. Getting Started",
  "Open a study and add animals.",
  "",
  "## 2. Observations",
  "Record body weight and clinical scores here.",
].join("\n");

describe("parseGuide", () => {
  it("splits into sections, drops the TOC, and strips leading numbers from titles", () => {
    const { intro, sections } = parseGuide(SAMPLE);
    expect(intro).toContain("Intro paragraph.");
    expect(sections.map((s) => s.title)).toEqual(["Getting Started", "Observations"]);
  });

  it("keeps the heading in the body markdown and lower-cases the haystack", () => {
    const { sections } = parseGuide(SAMPLE);
    const observations = sections.find((s) => s.title === "Observations");
    expect(observations?.body.startsWith("## 2. Observations")).toBe(true);
    expect(observations?.haystack).toContain("body weight");
  });
});

describe("searchGuideSections", () => {
  const { sections } = parseGuide(SAMPLE);

  it("ranks sections by how many query terms they contain", () => {
    const hits = searchGuideSections(sections, "body weight");
    expect(hits[0]?.title).toBe("Observations");
  });

  it("returns nothing for a non-matching query", () => {
    expect(searchGuideSections(sections, "zzznope")).toHaveLength(0);
  });

  it("falls back to the first sections for an empty query", () => {
    const hits = searchGuideSections(sections, "   ", 1);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.title).toBe("Getting Started");
  });
});
