import { describe, expect, it } from "vitest";

import {
  SEARCH_ENTITY_TYPE_META,
  type SearchEntityType,
  type SearchQuery,
} from "@/domain/entities/search";
import type { SearchHit } from "@/application/ports/search";
import type { SearchUseCaseDeps } from "@/application/use-cases/deps";
import { createSearchService } from "@/application/services/search-service";

const hit = (type: SearchEntityType, id: string): SearchHit => ({
  type,
  id,
  title: `${type}:${id}`,
  route: `/x/${id}`,
});

/**
 * Build a full set of fake readers that return the preset hits for their type
 * and record the queries they receive, so tests can assert which repositories
 * were touched and with what.
 */
function fakeReaders(
  hitsByType: Partial<Record<SearchEntityType, SearchHit[]>> = {},
) {
  const calls: SearchEntityType[] = [];
  const received: Partial<Record<SearchEntityType, SearchQuery>> = {};
  const make = (type: SearchEntityType) => async (query: SearchQuery) => {
    calls.push(type);
    received[type] = query;
    return hitsByType[type] ?? [];
  };
  const deps: SearchUseCaseDeps = {
    studies: { searchStudies: make("study") },
    animals: { searchAnimals: make("animal") },
    protocols: { searchProtocolTemplates: make("protocol_template") },
    timelineEvents: { searchTimelineEvents: make("timeline_event") },
    mriSessions: { searchMriSessions: make("mri_session") },
    observations: { searchObservations: make("observation") },
    researchAssets: { searchResearchAssets: make("research_asset") },
  };
  return { deps, calls, received };
}

function query(partial: Partial<SearchQuery> = {}): SearchQuery {
  return { text: "", filters: {}, ...partial };
}

describe("SearchService", () => {
  it("returns nothing and touches no reader for an empty query", async () => {
    const { deps, calls } = fakeReaders();
    const results = await createSearchService(deps).search(
      query({ text: "   " }),
    );
    expect(results).toEqual({ groups: [], total: 0 });
    expect(calls).toEqual([]);
  });

  it("fans a text query out to every reader and groups non-empty types in order", async () => {
    const { deps, calls } = fakeReaders({
      study: [hit("study", "s1")],
      observation: [hit("observation", "o1"), hit("observation", "o2")],
    });
    const results = await createSearchService(deps).search(query({ text: "x" }));

    // Eligible readers were all queried...
    expect(calls).toHaveLength(7);
    // ...but only non-empty groups surface, in canonical order.
    expect(results.groups.map((g) => g.type)).toEqual(["study", "observation"]);
    expect(results.groups[0]?.label).toBe(
      SEARCH_ENTITY_TYPE_META.study.pluralLabel,
    );
    expect(results.groups[1]?.hits).toHaveLength(2);
    expect(results.total).toBe(3);
  });

  it("restricts which repositories are queried by an entity-specific filter", async () => {
    const { deps, calls } = fakeReaders({
      mri_session: [hit("mri_session", "m1")],
    });
    const results = await createSearchService(deps).search(
      query({ text: "brain", filters: { mriModality: "mri" } }),
    );
    expect(calls).toEqual(["mri_session"]);
    expect(results.groups.map((g) => g.type)).toEqual(["mri_session"]);
    expect(results.total).toBe(1);
  });

  it("honors a type scope", async () => {
    const { deps, calls } = fakeReaders({ animal: [hit("animal", "a1")] });
    await createSearchService(deps).search(
      query({ text: "x", types: ["animal"] }),
    );
    expect(calls).toEqual(["animal"]);
  });

  it("trims the text before delegating to readers", async () => {
    const { deps, received } = fakeReaders({ study: [hit("study", "s1")] });
    await createSearchService(deps).search(
      query({ text: "  cortex  ", types: ["study"] }),
    );
    expect(received.study?.text).toBe("cortex");
  });

  it("surfaces each reader's hits under its own group", async () => {
    const { deps } = fakeReaders({
      animal: [hit("animal", "a1")],
      timeline_event: [hit("timeline_event", "t1")],
      research_asset: [hit("research_asset", "r1")],
    });
    const results = await createSearchService(deps).search(
      query({ filters: { studyId: "s1" } }),
    );
    expect(results.groups.map((g) => g.type)).toEqual([
      "animal",
      "timeline_event",
      "research_asset",
    ]);
    expect(results.total).toBe(3);
    expect(results.groups[0]?.hits[0]?.id).toBe("a1");
  });
});
