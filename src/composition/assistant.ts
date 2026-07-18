/**
 * Composition root for the AI assistant.
 * ----------------------------------------------------------------------------
 * Wires the Gemini provider adapter and the read-only tool registry (over the
 * already-built application services) into the {@link AgentService}, and exposes
 * the credential store for the Settings screen. Provider choice lives entirely
 * here: swapping Gemini for a backend proxy or a local model later is a one-line
 * change to the adapter, with no impact on the agent loop, tools, or UI.
 *
 * Safe to import in the browser preview — the adapters connect to the desktop
 * bridge lazily (and degrade honestly when it is absent).
 */
import {
  createAgentService,
  type AgentService,
} from "@/application/services/agent-service";
import { createAgentTools } from "@/application/ai/agent-tools";
import type { AiCredentialStore } from "@/application/ports/ai-assistant";
import { MultiProviderAssistant } from "@/infrastructure/ai/multi-provider-assistant";
import { AiCredentials } from "@/infrastructure/ai/ai-credentials";
import { studiesService } from "@/composition/studies";
import { animalsService } from "@/composition/animals";
import { observationsService } from "@/composition/observations";
import { timelineEventsService } from "@/composition/timeline-events";
import { analyticsService } from "@/composition/analytics";
import { dashboardService } from "@/composition/dashboard";
import { searchService } from "@/composition/search";
import { biomarkerService } from "@/composition/biomarkers";

export const agentService: AgentService = createAgentService({
  assistant: new MultiProviderAssistant(),
  tools: createAgentTools({
    studies: studiesService,
    animals: animalsService,
    observations: observationsService,
    timeline: timelineEventsService,
    analytics: analyticsService,
    dashboard: dashboardService,
    search: searchService,
    biomarker: biomarkerService,
  }),
});

export const aiCredentialStore: AiCredentialStore = new AiCredentials();
