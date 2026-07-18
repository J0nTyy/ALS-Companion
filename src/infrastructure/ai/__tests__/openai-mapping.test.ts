import { describe, expect, it } from "vitest";

import { fromOpenAiResponse, toOpenAiRequest } from "@/infrastructure/ai/openai-mapping";
import type { AiGenerateRequest } from "@/application/ai/ai-types";

interface OpenAiBody {
  model: string;
  messages: Record<string, unknown>[];
  tools?: { type: string; function: { name: string; parameters: Record<string, unknown> } }[];
  tool_choice?: string;
  temperature?: number;
}

function baseRequest(): AiGenerateRequest {
  return {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    system: "You are a test.",
    turns: [{ role: "user", parts: [{ kind: "text", text: "hi" }] }],
    tools: [
      {
        name: "get_thing",
        description: "Get a thing.",
        parameters: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
    ],
  };
}

describe("toOpenAiRequest", () => {
  it("prepends a system message, maps the user turn, and declares tools", () => {
    const body = toOpenAiRequest(baseRequest()) as unknown as OpenAiBody;
    expect(body.model).toBe("llama-3.3-70b-versatile");
    expect(body.messages[0]).toEqual({ role: "system", content: "You are a test." });
    expect(body.messages[1]).toEqual({ role: "user", content: "hi" });
    expect(body.tools?.[0]?.type).toBe("function");
    expect(body.tools?.[0]?.function.name).toBe("get_thing");
    // Lowercase JSON-Schema types pass through unchanged (OpenAI accepts them).
    expect(body.tools?.[0]?.function.parameters.type).toBe("object");
    expect(body.tool_choice).toBe("auto");
  });

  it("maps a model tool call to an assistant tool_calls message and a result to a tool message", () => {
    const request = baseRequest();
    request.turns = [
      { role: "user", parts: [{ kind: "text", text: "hi" }] },
      {
        role: "model",
        parts: [{ kind: "tool_call", name: "get_thing", args: { id: "x" }, id: "call_1" }],
      },
      {
        role: "user",
        parts: [{ kind: "tool_result", name: "get_thing", result: { ok: true }, id: "call_1" }],
      },
    ];
    const body = toOpenAiRequest(request) as unknown as OpenAiBody;

    const assistant = body.messages[2] as {
      role: string;
      tool_calls?: { id: string; function: { name: string; arguments: string } }[];
    };
    expect(assistant.role).toBe("assistant");
    expect(assistant.tool_calls?.[0]?.id).toBe("call_1");
    expect(assistant.tool_calls?.[0]?.function.name).toBe("get_thing");
    expect(JSON.parse(assistant.tool_calls?.[0]?.function.arguments ?? "{}")).toEqual({ id: "x" });

    const toolMessage = body.messages[3] as { role: string; tool_call_id: string; content: string };
    expect(toolMessage.role).toBe("tool");
    expect(toolMessage.tool_call_id).toBe("call_1");
    expect(JSON.parse(toolMessage.content)).toEqual({ ok: true });
  });
});

describe("fromOpenAiResponse", () => {
  it("extracts assistant text", () => {
    const result = fromOpenAiResponse({
      choices: [{ message: { content: "hello world" }, finish_reason: "stop" }],
    });
    expect(result.text).toBe("hello world");
    expect(result.toolCalls).toHaveLength(0);
  });

  it("extracts tool calls with parsed JSON arguments and id", () => {
    const result = fromOpenAiResponse({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "get_thing", arguments: '{"id":"x"}' },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    });
    expect(result.toolCalls).toEqual([{ name: "get_thing", args: { id: "x" }, id: "call_1" }]);
  });

  it("throws when there are no choices", () => {
    expect(() => fromOpenAiResponse({ choices: [] })).toThrow();
  });
});
