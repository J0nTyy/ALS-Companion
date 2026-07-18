/**
 * The agent loop (application orchestration). It appends the user's question, then
 * repeatedly asks the model provider; whenever the model requests tools, it runs
 * them through the registry and feeds the results back, until the model replies
 * with plain text or the step budget is exhausted.
 *
 * Tools are either read-only (their result goes back to the model) or "propose"
 * tools (their result is an {@link AgentProposal} routed to the UI as a confirmation
 * card, and the model is only told it was proposed). Either way the agent itself
 * never writes to the database — a human confirm does. The system prompt and tool
 * set are fixed here; the provider is injected, so the loop is provider-agnostic.
 */
import type { AiAssistant } from "@/application/ports/ai-assistant";
import type { AgentTool, AgentToolRegistry } from "@/application/ai/agent-tool";
import type {
  AiPart,
  AiProvider,
  AiToolDeclaration,
  AiTurn,
} from "@/application/ai/ai-types";
import {
  isAgentProposal,
  type AgentProposal,
} from "@/application/ai/agent-proposals";
import { buildAgentSystemPrompt } from "@/application/ai/agent-prompt";

export interface AgentToolInvocation {
  name: string;
  args: Record<string, unknown>;
}

export interface AgentAskInput {
  question: string;
  /** Prior conversation (pass back {@link AgentAskResult.turns} each time). */
  history: AiTurn[];
  /** Which provider to use, resolved from settings by the caller. */
  provider: AiProvider;
  /** Provider model id, resolved from settings by the caller. */
  model: string;
  /** What the researcher is currently looking at (page + selection), for the model. */
  context?: string;
}

export interface AgentAskResult {
  text: string;
  /** The full conversation so far — pass as `history` on the next ask. */
  turns: AiTurn[];
  /** Tools that ran while answering (for a UI "what I looked at" trace). */
  invocations: AgentToolInvocation[];
  /** Records the assistant proposed this turn — shown as confirmation cards. */
  proposals: AgentProposal[];
}

export interface AgentService {
  ask(input: AgentAskInput): Promise<AgentAskResult>;
}

export interface AgentServiceDeps {
  assistant: AiAssistant;
  tools: AgentToolRegistry;
  /** Safety cap on tool-calling rounds per question. */
  maxSteps?: number;
}

// A safety cap on tool-calling rounds per question. Multi-hop work — resolving an
// animal → its study → its timeline events, or gathering a study's animals,
// analytics, timeline, and biomarkers before drafting a report summary — can each
// need a round, so keep generous headroom that lets rich answers finish; this only
// guards against a model that loops without ever converging on an answer.
const DEFAULT_MAX_STEPS = 10;

function toDeclaration(tool: AgentTool): AiToolDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createAgentService(deps: AgentServiceDeps): AgentService {
  const declarations = deps.tools.map(toDeclaration);
  const byName = new Map(deps.tools.map((tool) => [tool.name, tool]));
  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;

  return {
    async ask({ question, history, provider, model, context }): Promise<AgentAskResult> {
      const system = buildAgentSystemPrompt(context);
      const turns: AiTurn[] = [
        ...history,
        { role: "user", parts: [{ kind: "text", text: question }] },
      ];
      const invocations: AgentToolInvocation[] = [];
      const proposals: AgentProposal[] = [];

      for (let step = 0; step < maxSteps; step++) {
        const result = await deps.assistant.generate({
          provider,
          model,
          system,
          turns,
          tools: declarations,
        });

        if (result.toolCalls.length === 0) {
          turns.push({ role: "model", parts: [{ kind: "text", text: result.text }] });
          return { text: result.text, turns, invocations, proposals };
        }

        // Record the model's turn (any preamble text + the calls it made)...
        const modelParts: AiPart[] = [];
        if (result.text.trim() !== "") {
          modelParts.push({ kind: "text", text: result.text });
        }
        for (const call of result.toolCalls) {
          modelParts.push({
            kind: "tool_call",
            name: call.name,
            args: call.args,
            ...(call.id ? { id: call.id } : {}),
            ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
          });
        }
        turns.push({ role: "model", parts: modelParts });

        // ...then run each tool and feed the results back as one user turn.
        const resultParts: AiPart[] = [];
        for (const call of result.toolCalls) {
          invocations.push({ name: call.name, args: call.args });
          const idPart = call.id ? { id: call.id } : {};
          const tool = byName.get(call.name);
          if (!tool) {
            resultParts.push({
              kind: "tool_result",
              name: call.name,
              result: { error: `Unknown tool: ${call.name}` },
              isError: true,
              ...idPart,
            });
            continue;
          }
          try {
            const output = await tool.execute(call.args);
            if (tool.isProposal && isAgentProposal(output)) {
              // Don't hand the model the record — show the researcher a card and
              // tell the model it's pending, so it never claims a save happened.
              proposals.push(output);
              resultParts.push({
                kind: "tool_result",
                name: call.name,
                result: {
                  status: "proposed",
                  summary: output.summary,
                  note: "Shown to the researcher to confirm — NOT saved yet. Do not say it was saved.",
                },
                ...idPart,
              });
            } else {
              resultParts.push({
                kind: "tool_result",
                name: call.name,
                result: output,
                ...idPart,
              });
            }
          } catch (error) {
            resultParts.push({
              kind: "tool_result",
              name: call.name,
              result: { error: errorText(error) },
              isError: true,
              ...idPart,
            });
          }
        }
        turns.push({ role: "user", parts: resultParts });
      }

      const message =
        "I couldn't finish answering within the allowed number of steps. Please try a more specific question.";
      turns.push({ role: "model", parts: [{ kind: "text", text: message }] });
      return { text: message, turns, invocations, proposals };
    },
  };
}
