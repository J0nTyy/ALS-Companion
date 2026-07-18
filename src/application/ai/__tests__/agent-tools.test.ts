import { describe, expect, it } from "vitest";

import { createAgentTools, type AgentToolDeps } from "@/application/ai/agent-tools";
import type { AgentTool } from "@/application/ai/agent-tool";
import type { SearchService } from "@/application/services/search-service";
import type { AnimalsService } from "@/application/services/animals-service";
import type { SearchQuery } from "@/domain/entities/search";

function makeDeps(overrides: Partial<AgentToolDeps> = {}): AgentToolDeps {
  const base = {
    studies: {
      list: async () => [{ id: "s1", name: "Study One" }],
      get: async (id: string) => (id === "s1" ? { id: "s1", name: "Study One" } : null),
    },
    animals: { listByStudy: async () => [{ id: "a1" }], get: async () => null },
    observations: { listByAnimal: async () => [] },
    timeline: { listByAnimal: async () => [] },
    analytics: { forStudy: async () => ({}), overview: async () => ({}), listStudies: async () => [] },
    dashboard: { load: async () => ({ counts: {} }) },
    search: { search: async () => ({ groups: [], total: 0 }) },
    biomarker: { listSamples: async () => [], listResults: async () => [] },
  };
  return { ...(base as unknown as AgentToolDeps), ...overrides };
}

function tool(deps: AgentToolDeps, name: string): AgentTool {
  const found = createAgentTools(deps).find((candidate) => candidate.name === name);
  if (!found) throw new Error(`No tool named ${name}`);
  return found;
}

describe("createAgentTools", () => {
  it("list_studies passes includeArchived and returns the service result", async () => {
    const result = await tool(makeDeps(), "list_studies").execute({ includeArchived: true });
    expect(result).toEqual([{ id: "s1", name: "Study One" }]);
  });

  it("get_study returns a friendly error when the study is missing", async () => {
    const result = await tool(makeDeps(), "get_study").execute({ studyId: "nope" });
    expect(result).toEqual({ error: "No study with that id." });
  });

  it("get_study throws when the required argument is missing", async () => {
    await expect(tool(makeDeps(), "get_study").execute({})).rejects.toThrow(/studyId/);
  });

  it("search_records builds a SearchQuery with an optional study filter", async () => {
    let received: SearchQuery | null = null;
    const deps = makeDeps({
      search: {
        search: async (query: SearchQuery) => {
          received = query;
          return { groups: [], total: 0 };
        },
      } as unknown as SearchService,
    });

    await tool(deps, "search_records").execute({ query: "brain", studyId: "s1" });

    expect(received).toEqual({ text: "brain", filters: { studyId: "s1" } });
  });

  it("exposes read + propose tools, but no direct write tools", () => {
    const tools = createAgentTools(makeDeps());
    const names = tools.map((toolDef) => toolDef.name);
    // Nothing writes directly — the agent can only read or propose.
    expect(names.some((name) => /^(create|update|delete|archive|save)_/.test(name))).toBe(false);
    // Propose tools exist and are flagged so the loop routes them to a confirm card.
    const proposeTools = tools.filter((toolDef) => toolDef.name.startsWith("propose_"));
    expect(proposeTools.length).toBeGreaterThan(0);
    expect(proposeTools.every((toolDef) => toolDef.isProposal === true)).toBe(true);
    expect(names).toContain("get_workspace_overview");
    expect(names).toContain("search_user_guide");
  });

  it("propose_observation resolves the study from the animal and builds a proposal (no write)", async () => {
    const deps = makeDeps({
      animals: {
        listByStudy: async () => [],
        get: async () => ({ id: "a1", studyId: "s1", animalIdentifier: "M-101" }),
      } as unknown as AnimalsService,
    });
    const result = await tool(deps, "propose_observation").execute({
      animalId: "a1",
      kind: "body_weight",
      value: 24.3,
      observedOn: "2026-07-18",
    });
    expect(result).toMatchObject({
      type: "observation",
      input: {
        animalId: "a1",
        studyId: "s1",
        kind: "body_weight",
        value: 24.3,
        observedOn: "2026-07-18",
      },
    });
  });

  it("propose_observation throws when the animal is unknown", async () => {
    await expect(
      tool(makeDeps(), "propose_observation").execute({
        animalId: "nope",
        kind: "body_weight",
        value: 20,
      }),
    ).rejects.toThrow(/animal/i);
  });

  it("propose_observation requires a scale name for a motor score", async () => {
    const deps = makeDeps({
      animals: {
        listByStudy: async () => [],
        get: async () => ({ id: "a1", studyId: "s1", animalIdentifier: "M-101" }),
      } as unknown as AnimalsService,
    });
    await expect(
      tool(deps, "propose_observation").execute({ animalId: "a1", kind: "motor_score", value: 3 }),
    ).rejects.toThrow(/scale/i);
  });
});
