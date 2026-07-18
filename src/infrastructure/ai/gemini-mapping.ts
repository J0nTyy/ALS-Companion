/**
 * Pure translation between the provider-neutral agent types and Google Gemini's
 * `generateContent` wire format. No I/O here, so it is fully unit-tested; the
 * adapter ({@link GeminiAssistant}) only adds the Tauri invoke call around it.
 */
import type {
  AiGenerateRequest,
  AiGenerateResult,
  AiToolCall,
  AiTurn,
  JsonSchema,
} from "@/application/ai/ai-types";

type GeminiPart = Record<string, unknown>;
interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

/** Gemini's Schema.type is an uppercase enum (STRING, OBJECT, …). */
function toGeminiSchema(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type.toUpperCase() };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.items) out.items = toGeminiSchema(schema.items);
  if (schema.properties) {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = toGeminiSchema(value);
    }
    out.properties = properties;
  }
  if (schema.required && schema.required.length > 0) out.required = schema.required;
  return out;
}

function turnToContent(turn: AiTurn): GeminiContent {
  const parts: GeminiPart[] = [];
  for (const part of turn.parts) {
    if (part.kind === "text") {
      if (part.text !== "") parts.push({ text: part.text });
    } else if (part.kind === "tool_call") {
      const functionCall: Record<string, unknown> = { name: part.name, args: part.args };
      if (part.id) functionCall.id = part.id;
      // thoughtSignature is a Part-level field (sibling of functionCall) that thinking
      // models require echoed back verbatim.
      const wrapper: GeminiPart = { functionCall };
      if (part.thoughtSignature) wrapper.thoughtSignature = part.thoughtSignature;
      parts.push(wrapper);
    } else {
      const response = part.isError ? { error: part.result } : { output: part.result };
      const functionResponse: Record<string, unknown> = { name: part.name, response };
      if (part.id) functionResponse.id = part.id;
      parts.push({ functionResponse });
    }
  }
  return { role: turn.role, parts };
}

export function toGeminiRequest(request: AiGenerateRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents: request.turns.map(turnToContent),
    systemInstruction: { parts: [{ text: request.system }] },
    generationConfig: { temperature: 0.3 },
  };
  if (request.tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: request.tools.map((tool) => {
          const declaration: Record<string, unknown> = {
            name: tool.name,
            description: tool.description,
          };
          // Gemini rejects an OBJECT parameter schema with empty `properties`
          // ("should be non-empty for OBJECT type"), so a no-argument tool must
          // omit `parameters` entirely rather than send `{type: OBJECT, properties: {}}`.
          if (
            tool.parameters.properties &&
            Object.keys(tool.parameters.properties).length > 0
          ) {
            declaration.parameters = toGeminiSchema(tool.parameters);
          }
          return declaration;
        }),
      },
    ];
    body.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
  }
  return body;
}

function readBlockReason(promptFeedback: unknown): string | undefined {
  if (promptFeedback && typeof promptFeedback === "object") {
    const reason = (promptFeedback as { blockReason?: unknown }).blockReason;
    if (typeof reason === "string") return reason;
  }
  return undefined;
}

export function fromGeminiResponse(json: unknown): AiGenerateResult {
  const root = (json ?? {}) as { candidates?: unknown; promptFeedback?: unknown };
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];

  if (candidates.length === 0) {
    const blockReason = readBlockReason(root.promptFeedback);
    throw new Error(
      blockReason
        ? `The AI declined to respond (${blockReason}).`
        : "The AI returned no response.",
    );
  }

  const first = candidates[0] as {
    content?: { parts?: unknown };
    finishReason?: unknown;
  };
  const rawParts = Array.isArray(first.content?.parts)
    ? (first.content?.parts as unknown[])
    : [];

  let text = "";
  const toolCalls: AiToolCall[] = [];
  for (const rawPart of rawParts) {
    const part = rawPart as Record<string, unknown>;
    if (typeof part.text === "string") {
      text += part.text;
    } else if (part.functionCall && typeof part.functionCall === "object") {
      const fc = part.functionCall as { name?: unknown; args?: unknown; id?: unknown };
      if (typeof fc.name === "string") {
        const call: AiToolCall = {
          name: fc.name,
          args:
            fc.args && typeof fc.args === "object"
              ? (fc.args as Record<string, unknown>)
              : {},
        };
        if (typeof fc.id === "string") call.id = fc.id;
        // Capture the Part-level thoughtSignature so it can be echoed back on replay.
        if (typeof part.thoughtSignature === "string") {
          call.thoughtSignature = part.thoughtSignature;
        }
        toolCalls.push(call);
      }
    }
  }

  if (text === "" && toolCalls.length === 0) {
    const finishReason =
      typeof first.finishReason === "string" ? first.finishReason : undefined;
    if (finishReason && finishReason !== "STOP") {
      throw new Error(`The AI stopped without an answer (${finishReason}).`);
    }
  }

  return { text, toolCalls };
}
