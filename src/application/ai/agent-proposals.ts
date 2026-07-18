/**
 * A record the assistant PROPOSES for the researcher to confirm. This is how data
 * entry stays safe: a `propose_*` tool returns one of these (nothing is written),
 * the agent loop routes it to the chat as a confirmation card, and only the
 * researcher's confirm calls the real create use-case. The agent never writes.
 */
import type { NewObservationInput } from "@/domain/entities/observation";
import type { NewTimelineEventInput } from "@/domain/entities/timeline-event";
import type { NewBiomarkerResultInput } from "@/domain/entities/biomarker-result";

export interface ProposalField {
  label: string;
  value: string;
}

interface ProposalBase {
  /** Card title, e.g. "Observation". */
  title: string;
  /** One-line summary (also fed back to the model as the confirmation note). */
  summary: string;
  /** Field rows shown on the confirmation card. */
  fields: ProposalField[];
}

/**
 * Discriminated by `type`; `input` is exactly what the matching create use-case
 * expects, so applying a confirmed proposal is a direct service call.
 */
export type AgentProposal =
  | (ProposalBase & { type: "observation"; input: NewObservationInput })
  | (ProposalBase & { type: "timeline_event"; input: NewTimelineEventInput })
  | (ProposalBase & { type: "biomarker_result"; input: NewBiomarkerResultInput })
  | (ProposalBase & { type: "study_summary"; input: { studyId: string; summary: string } });

/** Defensive narrowing of a tool result to an {@link AgentProposal}. */
export function isAgentProposal(value: unknown): value is AgentProposal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; input?: unknown };
  const knownType =
    candidate.type === "observation" ||
    candidate.type === "timeline_event" ||
    candidate.type === "biomarker_result" ||
    candidate.type === "study_summary";
  return knownType && typeof candidate.input === "object" && candidate.input !== null;
}
