import { describe, expect, it } from "vitest";

import {
  animalHit,
  animalDetailRoute,
  mriSessionHit,
  observationHit,
  protocolTemplateHit,
  researchAssetHit,
  studyDetailRoute,
  studyHit,
  timelineEventHit,
} from "@/application/use-cases/search/search-hit";

describe("route builders", () => {
  it("build study and animal detail routes", () => {
    expect(studyDetailRoute("s1")).toBe("/studies/s1");
    expect(animalDetailRoute("s1", "a1")).toBe("/studies/s1/animals/a1");
  });
});

describe("studyHit", () => {
  it("titles by name, routes to the study, subtitles status + strain", () => {
    const hit = studyHit({
      id: "s1",
      name: "SOD1 cohort",
      strain: "SOD1-G93A",
      status: "active",
    });
    expect(hit).toEqual({
      type: "study",
      id: "s1",
      title: "SOD1 cohort",
      route: "/studies/s1",
      subtitle: "Active · SOD1-G93A",
    });
  });
});

describe("animalHit", () => {
  it("joins the present subtitle parts and routes to the animal", () => {
    const hit = animalHit({
      id: "a1",
      studyId: "s1",
      identifier: "M-12",
      studyName: "SOD1 cohort",
      mutation: "SOD1",
      treatmentGroup: "Riluzole",
    });
    expect(hit.type).toBe("animal");
    expect(hit.title).toBe("M-12");
    expect(hit.route).toBe("/studies/s1/animals/a1");
    expect(hit.subtitle).toBe("SOD1 · Riluzole · SOD1 cohort");
  });

  it("omits the subtitle entirely when there are no parts", () => {
    const hit = animalHit({
      id: "a1",
      studyId: "s1",
      identifier: "M-12",
      studyName: "",
    });
    expect("subtitle" in hit).toBe(false);
  });
});

describe("other entity hits", () => {
  it("builds a protocol hit routed to its study", () => {
    const hit = protocolTemplateHit({
      id: "p1",
      studyId: "s1",
      name: "Standard protocol",
      studyName: "SOD1 cohort",
    });
    expect(hit.route).toBe("/studies/s1");
    expect(hit.subtitle).toBe("Protocol · SOD1 cohort");
  });

  it("builds a timeline event hit routed to the animal", () => {
    const hit = timelineEventHit({
      id: "t1",
      studyId: "s1",
      animalId: "a1",
      title: "Confirm SOD1",
      category: "gene_confirmation",
      status: "completed",
      animalIdentifier: "M-12",
    });
    expect(hit.route).toBe("/studies/s1/animals/a1");
    expect(hit.subtitle).toBe("Gene Confirmation · Completed · M-12");
  });

  it("builds an MRI session hit", () => {
    const hit = mriSessionHit({
      id: "m1",
      studyId: "s1",
      animalId: "a1",
      title: "Baseline brain",
      modality: "mri",
      animalIdentifier: "M-12",
    });
    expect(hit.subtitle).toBe("MRI · M-12");
  });

  it("titles an observation by its kind label", () => {
    const hit = observationHit({
      id: "o1",
      studyId: "s1",
      animalId: "a1",
      kind: "body_weight",
      observedOn: "2026-07-10",
      animalIdentifier: "M-12",
    });
    expect(hit.title).toBe("Body weight");
    expect(hit.subtitle).toBe("2026-07-10 · M-12");
  });

  it("builds a research asset hit", () => {
    const hit = researchAssetHit({
      id: "r1",
      studyId: "s1",
      animalId: "a1",
      title: "T2 axial series",
      assetType: "mri_image",
      status: "planned",
      animalIdentifier: "M-12",
    });
    expect(hit.type).toBe("research_asset");
    expect(hit.subtitle).toBe("MRI Image · Planned · M-12");
  });
});
