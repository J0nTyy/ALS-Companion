import { useCallback, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import type { AiTurn } from "@/application/ai/ai-types";
import type { AgentProposal } from "@/application/ai/agent-proposals";
import { useSettings } from "@/shared/hooks/use-settings";
import { rawErrorMessage } from "@/presentation/lib/error-message";
import { useAssistant } from "@/presentation/features/assistant/assistant-context";

/** A friendly name for the page the researcher is on, from the route path. */
function describeRoute(pathname: string): string {
  if (pathname === "/") return "the Dashboard";
  if (pathname.startsWith("/studies/") && pathname.includes("/animals/")) {
    return "an Animal detail page";
  }
  if (pathname.startsWith("/studies/new")) return "the New Study page";
  if (pathname.startsWith("/studies/")) return "a Study detail page";
  if (pathname.startsWith("/studies")) return "the Studies list";
  if (pathname.startsWith("/publish")) return "the Publication workspace";
  if (pathname.startsWith("/analytics")) return "the Analytics page";
  if (pathname.startsWith("/compare")) return "the MRI comparison page";
  if (pathname.startsWith("/search")) return "the Search page";
  if (pathname.startsWith("/settings")) return "the Settings page";
  if (pathname.startsWith("/help")) return "the Help page";
  return "the app";
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  /** Distinct tool names the assistant used (assistant messages only). */
  tools?: string[];
  /** Records the assistant proposed this turn, rendered as confirmation cards. */
  proposals?: AgentProposal[];
  error?: boolean;
}

export interface AssistantChat {
  messages: ChatMessage[];
  busy: boolean;
  send: (question: string) => Promise<void>;
  clear: () => void;
}

/**
 * Chat state for the assistant panel. Keeps the running message list for display
 * and the provider conversation `turns` (in a ref) so follow-up questions have
 * context. The heavy lifting — the tool-calling loop — lives in the AgentService.
 */
export function useAssistantChat(): AssistantChat {
  const { service, pageContext } = useAssistant();
  const { settings } = useSettings();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const historyRef = useRef<AiTurn[]>([]);

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (text === "" || busy) return;
      setMessages((prev) => [...prev, { role: "user", text }]);
      setBusy(true);
      try {
        // Tell the model what the researcher is looking at so words like "this study"
        // or "here" resolve — the route gives a baseline; a screen may add specifics.
        const context = [`The researcher is currently on ${describeRoute(location.pathname)}.`]
          .concat(pageContext ? [pageContext] : [])
          .join(" ");
        const result = await service.ask({
          question: text,
          history: historyRef.current,
          provider: settings.aiProvider,
          model: settings.aiModel,
          context,
        });
        historyRef.current = result.turns;
        const tools = [...new Set(result.invocations.map((invocation) => invocation.name))];
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: result.text,
            ...(tools.length > 0 ? { tools } : {}),
            ...(result.proposals.length > 0 ? { proposals: result.proposals } : {}),
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: rawErrorMessage(error, "Something went wrong talking to the assistant."),
            error: true,
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [service, busy, settings.aiProvider, settings.aiModel, location.pathname, pageContext],
  );

  const clear = useCallback(() => {
    historyRef.current = [];
    setMessages([]);
  }, []);

  return { messages, busy, send, clear };
}
