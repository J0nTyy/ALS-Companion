/**
 * Provider-neutral vocabulary for the AI assistant. The agent loop and the tool
 * registry speak only these types; a concrete provider adapter (Gemini today,
 * a backend proxy or a local model later) translates to and from its own wire
 * format. Keeping this boundary means swapping providers never touches the agent
 * logic or the tools.
 */

/** A minimal JSON-Schema subset — enough to describe a tool's parameters. */
export interface JsonSchema {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: string[];
  required?: string[];
}

/** Which model provider a request targets. */
export type AiProvider = "gemini" | "groq";

export type AiRole = "user" | "model";

/** A tool call the model asked for. `id` is set only when the provider supplies one. */
export interface AiToolCall {
  name: string;
  args: Record<string, unknown>;
  id?: string;
  /**
   * Opaque provider "thought signature" for thinking models (Gemini 2.5+). It must
   * be echoed back verbatim when the turn is replayed, or the provider rejects the
   * follow-up request. Absent for non-thinking models.
   */
  thoughtSignature?: string;
}

/** One piece of a conversation turn. */
export type AiPart =
  | { kind: "text"; text: string }
  | {
      kind: "tool_call";
      name: string;
      args: Record<string, unknown>;
      id?: string;
      thoughtSignature?: string;
    }
  | {
      kind: "tool_result";
      name: string;
      result: unknown;
      isError?: boolean;
      id?: string;
    };

/** One conversation turn: a user message, a model reply, or tool results. */
export interface AiTurn {
  role: AiRole;
  parts: AiPart[];
}

/** A tool the model may call, described for the provider. */
export interface AiToolDeclaration {
  name: string;
  description: string;
  parameters: JsonSchema;
}

/** One request to the model provider. */
export interface AiGenerateRequest {
  provider: AiProvider;
  model: string;
  system: string;
  turns: AiTurn[];
  tools: AiToolDeclaration[];
}

/** The model's reply: free text and/or tool calls to execute. */
export interface AiGenerateResult {
  text: string;
  toolCalls: AiToolCall[];
}
