/**
 * Pure translation between the provider-neutral agent types and the OpenAI
 * chat-completions format that Groq (and other OpenAI-compatible providers) use.
 * No I/O — fully unit-tested; the adapter adds the Tauri invoke call around it.
 *
 * Our {@link JsonSchema} already uses lowercase JSON-Schema types, which OpenAI
 * accepts as-is (unlike Gemini, which needs uppercase), so tool parameters pass
 * through unchanged — including an empty-properties object, which OpenAI tolerates.
 */
import type {
  AiGenerateRequest,
  AiGenerateResult,
  AiToolCall,
  AiTurn,
} from "@/application/ai/ai-types";

type OpenAiMessage = Record<string, unknown>;

function turnsToMessages(turns: AiTurn[]): OpenAiMessage[] {
  const messages: OpenAiMessage[] = [];
  for (const turn of turns) {
    if (turn.role === "user") {
      // A user turn may carry a typed message and/or tool results. Tool results
      // become separate `tool` messages (one per call), keyed by the call id.
      const texts: string[] = [];
      for (const part of turn.parts) {
        if (part.kind === "text") {
          texts.push(part.text);
        } else if (part.kind === "tool_result") {
          messages.push({
            role: "tool",
            tool_call_id: part.id ?? part.name,
            content: JSON.stringify(part.isError ? { error: part.result } : part.result),
          });
        }
      }
      if (texts.length > 0) messages.push({ role: "user", content: texts.join("\n") });
    } else {
      // A model turn becomes one assistant message (text + any tool calls).
      const texts: string[] = [];
      const toolCalls: OpenAiMessage[] = [];
      for (const part of turn.parts) {
        if (part.kind === "text") {
          texts.push(part.text);
        } else if (part.kind === "tool_call") {
          toolCalls.push({
            id: part.id ?? part.name,
            type: "function",
            function: { name: part.name, arguments: JSON.stringify(part.args) },
          });
        }
      }
      const message: OpenAiMessage = {
        role: "assistant",
        content: texts.length > 0 ? texts.join("\n") : null,
      };
      if (toolCalls.length > 0) message.tool_calls = toolCalls;
      messages.push(message);
    }
  }
  return messages;
}

export function toOpenAiRequest(request: AiGenerateRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: [
      { role: "system", content: request.system },
      ...turnsToMessages(request.turns),
    ],
    temperature: 0.3,
  };
  if (request.tools.length > 0) {
    body.tools = request.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
    body.tool_choice = "auto";
  }
  return body;
}

function parseArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string" && raw.trim() !== "") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // Leave args empty on unparseable JSON rather than throwing.
    }
  } else if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function fromOpenAiResponse(json: unknown): AiGenerateResult {
  const root = (json ?? {}) as { choices?: unknown };
  const choices = Array.isArray(root.choices) ? root.choices : [];
  if (choices.length === 0) {
    throw new Error("The AI returned no response.");
  }

  const first = choices[0] as {
    message?: { content?: unknown; tool_calls?: unknown };
    finish_reason?: unknown;
  };
  const message = first.message ?? {};
  const text = typeof message.content === "string" ? message.content : "";

  const toolCalls: AiToolCall[] = [];
  const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  for (const rawCall of rawCalls) {
    const call = rawCall as {
      id?: unknown;
      function?: { name?: unknown; arguments?: unknown };
    };
    const fn = call.function ?? {};
    if (typeof fn.name === "string") {
      const toolCall: AiToolCall = { name: fn.name, args: parseArguments(fn.arguments) };
      if (typeof call.id === "string") toolCall.id = call.id;
      toolCalls.push(toolCall);
    }
  }

  if (text === "" && toolCalls.length === 0) {
    const finishReason =
      typeof first.finish_reason === "string" ? first.finish_reason : undefined;
    if (finishReason && finishReason !== "stop") {
      throw new Error(`The AI stopped without an answer (${finishReason}).`);
    }
  }

  return { text, toolCalls };
}
