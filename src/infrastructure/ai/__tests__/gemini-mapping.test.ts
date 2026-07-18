import { describe, expect, it } from "vitest";

import { fromGeminiResponse, toGeminiRequest } from "@/infrastructure/ai/gemini-mapping";
import type { AiGenerateRequest } from "@/application/ai/ai-types";

interface GSchema {
  type: string;
  description?: string;
  enum?: string[];
  required?: string[];
  properties?: Record<string, GSchema>;
  items?: GSchema;
}
interface GeminiBody {
  systemInstruction: { parts: { text: string }[] };
  contents: { role: string; parts: Record<string, unknown>[] }[];
  tools?: { functionDeclarations: { name: string; parameters?: GSchema }[] }[];
  toolConfig?: { functionCallingConfig: { mode: string } };
}

function baseRequest(): AiGenerateRequest {
  return {
    provider: "gemini",
    model: "gemini-2.5-flash",
    system: "You are a test.",
    turns: [{ role: "user", parts: [{ kind: "text", text: "hi" }] }],
    tools: [
      {
        name: "get_thing",
        description: "Get a thing.",
        parameters: {
          type: "object",
          properties: { id: { type: "string", description: "id" } },
          required: ["id"],
        },
      },
    ],
  };
}

describe("toGeminiRequest", () => {
  it("maps system, contents, and function declarations with UPPERCASE schema types", () => {
    const body = toGeminiRequest(baseRequest()) as unknown as GeminiBody;
    expect(body.systemInstruction.parts[0]?.text).toBe("You are a test.");
    expect(body.contents[0]).toEqual({ role: "user", parts: [{ text: "hi" }] });
    const decl = body.tools?.[0]?.functionDeclarations[0];
    expect(decl?.name).toBe("get_thing");
    expect(decl?.parameters?.type).toBe("OBJECT");
    expect(decl?.parameters?.properties?.id?.type).toBe("STRING");
    expect(decl?.parameters?.required).toEqual(["id"]);
    expect(body.toolConfig?.functionCallingConfig.mode).toBe("AUTO");
  });

  it("maps tool calls to functionCall and tool results to a wrapped functionResponse", () => {
    const request = baseRequest();
    request.turns = [
      { role: "user", parts: [{ kind: "text", text: "hi" }] },
      {
        role: "model",
        parts: [{ kind: "tool_call", name: "get_thing", args: { id: "x" }, id: "c1" }],
      },
      {
        role: "user",
        parts: [{ kind: "tool_result", name: "get_thing", result: { ok: true }, id: "c1" }],
      },
    ];
    const body = toGeminiRequest(request) as unknown as GeminiBody;
    expect(body.contents[1]?.parts[0]?.functionCall).toEqual({
      name: "get_thing",
      args: { id: "x" },
      id: "c1",
    });
    expect(body.contents[2]?.parts[0]?.functionResponse).toEqual({
      name: "get_thing",
      response: { output: { ok: true } },
      id: "c1",
    });
  });

  it("omits parameters for a no-argument tool (Gemini rejects an empty OBJECT schema)", () => {
    const request = baseRequest();
    request.tools = [
      {
        name: "ping",
        description: "no args",
        parameters: { type: "object", properties: {}, required: [] },
      },
    ];
    const body = toGeminiRequest(request) as unknown as GeminiBody;
    const decl = body.tools?.[0]?.functionDeclarations[0];
    expect(decl?.name).toBe("ping");
    expect(decl?.parameters).toBeUndefined();
  });

  it("omits tools and toolConfig when there are no tools", () => {
    const request = baseRequest();
    request.tools = [];
    const body = toGeminiRequest(request) as unknown as GeminiBody;
    expect(body.tools).toBeUndefined();
    expect(body.toolConfig).toBeUndefined();
  });
});

describe("fromGeminiResponse", () => {
  it("concatenates text parts", () => {
    const result = fromGeminiResponse({
      candidates: [
        { content: { parts: [{ text: "hello" }, { text: " world" }] }, finishReason: "STOP" },
      ],
    });
    expect(result.text).toBe("hello world");
    expect(result.toolCalls).toHaveLength(0);
  });

  it("extracts function calls with args and id", () => {
    const result = fromGeminiResponse({
      candidates: [
        {
          content: { parts: [{ functionCall: { name: "get_thing", args: { id: "x" }, id: "c1" } }] },
        },
      ],
    });
    expect(result.toolCalls).toEqual([{ name: "get_thing", args: { id: "x" }, id: "c1" }]);
  });

  it("captures a functionCall's thoughtSignature (thinking models require it)", () => {
    const result = fromGeminiResponse({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: { name: "search_records", args: { query: "x" } },
                thoughtSignature: "SIG123",
              },
            ],
          },
        },
      ],
    });
    expect(result.toolCalls[0]?.thoughtSignature).toBe("SIG123");
  });

  it("echoes a tool call's thoughtSignature back at the Part level on replay", () => {
    const request = baseRequest();
    request.tools = [];
    request.turns = [
      {
        role: "model",
        parts: [
          { kind: "tool_call", name: "search_records", args: { query: "x" }, thoughtSignature: "SIG123" },
        ],
      },
    ];
    const body = toGeminiRequest(request) as unknown as GeminiBody;
    const part = body.contents[0]?.parts[0];
    expect(part?.thoughtSignature).toBe("SIG123");
    expect((part?.functionCall as { name: string } | undefined)?.name).toBe("search_records");
  });

  it("throws when the prompt was blocked", () => {
    expect(() =>
      fromGeminiResponse({ candidates: [], promptFeedback: { blockReason: "SAFETY" } }),
    ).toThrow(/SAFETY/);
  });

  it("throws when a candidate finishes without content", () => {
    expect(() =>
      fromGeminiResponse({ candidates: [{ content: { parts: [] }, finishReason: "SAFETY" }] }),
    ).toThrow(/SAFETY/);
  });
});
