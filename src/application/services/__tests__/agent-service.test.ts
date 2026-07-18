import { describe, expect, it, vi } from "vitest";

import type { AiAssistant } from "@/application/ports/ai-assistant";
import type { AgentTool } from "@/application/ai/agent-tool";
import type { AgentProposal } from "@/application/ai/agent-proposals";
import type {
  AiGenerateRequest,
  AiGenerateResult,
} from "@/application/ai/ai-types";
import { createAgentService } from "@/application/services/agent-service";

function scriptedAssistant(script: AiGenerateResult[]): {
  assistant: AiAssistant;
  requests: AiGenerateRequest[];
} {
  const requests: AiGenerateRequest[] = [];
  let index = 0;
  const assistant: AiAssistant = {
    async generate(request) {
      requests.push(request);
      return script[index++] ?? { text: "", toolCalls: [] };
    },
  };
  return { assistant, requests };
}

function echoTool(
  name: string,
  result: unknown,
  spy?: (args: Record<string, unknown>) => void,
): AgentTool {
  return {
    name,
    description: `desc ${name}`,
    parameters: { type: "object", properties: {}, required: [] },
    execute: async (args) => {
      spy?.(args);
      return result;
    },
  };
}

describe("createAgentService", () => {
  it("returns the model's text directly when it makes no tool calls", async () => {
    const { assistant } = scriptedAssistant([{ text: "Hello there.", toolCalls: [] }]);
    const service = createAgentService({ assistant, tools: [] });

    const result = await service.ask({ question: "hi", history: [], provider: "gemini", model: "m" });

    expect(result.text).toBe("Hello there.");
    expect(result.invocations).toEqual([]);
    expect(result.turns[0]).toEqual({ role: "user", parts: [{ kind: "text", text: "hi" }] });
    const last = result.turns[result.turns.length - 1];
    expect(last).toEqual({ role: "model", parts: [{ kind: "text", text: "Hello there." }] });
  });

  it("executes a requested tool, feeds the result back, and returns the final answer", async () => {
    const spy = vi.fn();
    const { assistant, requests } = scriptedAssistant([
      { text: "", toolCalls: [{ name: "list_studies", args: { includeArchived: true } }] },
      { text: "You have 2 studies.", toolCalls: [] },
    ]);
    const service = createAgentService({
      assistant,
      tools: [echoTool("list_studies", [{ id: "s1" }, { id: "s2" }], spy)],
    });

    const result = await service.ask({ question: "how many studies?", history: [], provider: "gemini", model: "m" });

    expect(spy).toHaveBeenCalledWith({ includeArchived: true });
    expect(result.text).toBe("You have 2 studies.");
    expect(result.invocations).toEqual([
      { name: "list_studies", args: { includeArchived: true } },
    ]);
    // The second model request must have seen the tool result fed back.
    const lastRequest = requests[requests.length - 1];
    expect(lastRequest).toBeDefined();
    const fedBack = lastRequest?.turns.some((turn) =>
      turn.parts.some((part) => part.kind === "tool_result"),
    );
    expect(fedBack).toBe(true);
  });

  it("reports an error result for an unknown tool without throwing", async () => {
    const { assistant } = scriptedAssistant([
      { text: "", toolCalls: [{ name: "does_not_exist", args: {} }] },
      { text: "Sorry, I couldn't do that.", toolCalls: [] },
    ]);
    const service = createAgentService({ assistant, tools: [] });

    const result = await service.ask({ question: "x", history: [], provider: "gemini", model: "m" });

    expect(result.text).toBe("Sorry, I couldn't do that.");
  });

  it("stops after maxSteps if the model keeps calling tools", async () => {
    const assistant: AiAssistant = {
      async generate() {
        return { text: "", toolCalls: [{ name: "loop", args: {} }] };
      },
    };
    const service = createAgentService({
      assistant,
      tools: [echoTool("loop", {})],
      maxSteps: 3,
    });

    const result = await service.ask({ question: "x", history: [], provider: "gemini", model: "m" });

    expect(result.text).toMatch(/couldn't finish/i);
  });

  it("routes a propose tool's result to proposals (not the model), as a pending record", async () => {
    const proposal: AgentProposal = {
      type: "observation",
      title: "Observation",
      summary: "Body weight 24 g for M-101 on 2026-07-18",
      fields: [{ label: "Animal", value: "M-101" }],
      input: {
        animalId: "a1",
        studyId: "s1",
        kind: "body_weight",
        observedOn: "2026-07-18",
        value: 24,
      },
    };
    const { assistant, requests } = scriptedAssistant([
      { text: "", toolCalls: [{ name: "propose_observation", args: { animalId: "a1" } }] },
      { text: "Prepared — confirm it below.", toolCalls: [] },
    ]);
    const proposeTool: AgentTool = {
      name: "propose_observation",
      description: "propose an observation",
      parameters: { type: "object", properties: {}, required: [] },
      isProposal: true,
      execute: async () => proposal,
    };

    const service = createAgentService({ assistant, tools: [proposeTool] });
    const result = await service.ask({
      question: "record 24 g for M-101",
      history: [],
      provider: "gemini",
      model: "m",
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.type).toBe("observation");
    expect(result.text).toBe("Prepared — confirm it below.");

    // The model was told it's pending (not saved), not handed the raw record.
    const secondRequest = requests[requests.length - 1];
    const fedBackPending = secondRequest?.turns.some((turn) =>
      turn.parts.some(
        (part) =>
          part.kind === "tool_result" &&
          typeof part.result === "object" &&
          part.result !== null &&
          (part.result as { status?: unknown }).status === "proposed",
      ),
    );
    expect(fedBackPending).toBe(true);
  });
});
