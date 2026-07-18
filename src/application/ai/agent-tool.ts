/**
 * A tool the AI assistant can call. Every tool is a thin, read-only wrapper over
 * an existing application service, so the assistant can only surface data that
 * already exists in the workspace — it can never fabricate records, and (in this
 * version) can never write. The registry is just a list of these.
 */
import type { JsonSchema } from "@/application/ai/ai-types";

export interface AgentTool {
  name: string;
  description: string;
  /** JSON-schema of the arguments (always an `object` schema). */
  parameters: JsonSchema;
  /**
   * When true, `execute` returns an {@link AgentProposal} (a record the researcher
   * must confirm) rather than data for the model. The agent loop routes it to the
   * UI as a confirmation card — nothing is written until the researcher confirms.
   */
  isProposal?: boolean;
  /** Run the tool. Returns plain JSON-serializable data for the model to read. */
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export type AgentToolRegistry = readonly AgentTool[];
