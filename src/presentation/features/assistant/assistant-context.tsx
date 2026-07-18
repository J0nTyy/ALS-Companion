import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AgentService } from "@/application/services/agent-service";
import type { AiCredentialStore } from "@/application/ports/ai-assistant";
import { isTauri } from "@/infrastructure/platform/environment";
import { useSettings } from "@/shared/hooks/use-settings";

const ASSISTANT_OPEN_KEY = "als.assistant.open";

function readAssistantOpen(): boolean {
  try {
    return localStorage.getItem(ASSISTANT_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function persistAssistantOpen(open: boolean): void {
  try {
    localStorage.setItem(ASSISTANT_OPEN_KEY, open ? "1" : "0");
  } catch {
    // Remembering the panel state is best-effort.
  }
}

interface AssistantContextValue {
  service: AgentService;
  credentials: AiCredentialStore;
  /** Enabled in Settings AND running on the desktop bridge. */
  available: boolean;
  /** Whether the docked assistant panel is open. */
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Open the panel and send `question` to the assistant. */
  ask: (question: string) => void;
  /** A question queued via {@link ask} for the panel to send (null when none). */
  pendingQuestion: string | null;
  /** The panel calls this once it has picked up {@link pendingQuestion}. */
  consumePending: () => void;
  /** A short description of what the researcher is doing, passed to the model. */
  pageContext: string | null;
  setPageContext: (context: string | null) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

/**
 * Injects the AI assistant service + credential store into the tree, and owns the
 * assistant's shared UI/session state: whether the docked panel is open (remembered
 * across launches), a queued question any screen can send via {@link ask}, and a
 * short "what the researcher is doing" context that screens publish so the model
 * knows which page/record they're on. Concrete service instances are built in the
 * composition root, so the UI depends only on the interfaces.
 */
export function AssistantProvider({
  service,
  credentials,
  children,
}: {
  service: AgentService;
  credentials: AiCredentialStore;
  children: ReactNode;
}) {
  const { settings } = useSettings();
  const available = settings.aiAssistantEnabled && isTauri();

  const [open, setOpenState] = useState(() => readAssistantOpen());
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<string | null>(null);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    persistAssistantOpen(next);
  }, []);

  const toggle = useCallback(() => {
    setOpenState((current) => {
      const next = !current;
      persistAssistantOpen(next);
      return next;
    });
  }, []);

  const ask = useCallback(
    (question: string) => {
      setPendingQuestion(question);
      setOpen(true);
    },
    [setOpen],
  );

  const consumePending = useCallback(() => setPendingQuestion(null), []);

  const value = useMemo(
    () => ({
      service,
      credentials,
      available,
      open,
      setOpen,
      toggle,
      ask,
      pendingQuestion,
      consumePending,
      pageContext,
      setPageContext,
    }),
    [
      service,
      credentials,
      available,
      open,
      setOpen,
      toggle,
      ask,
      pendingQuestion,
      consumePending,
      pageContext,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAssistant(): AssistantContextValue {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
}

/**
 * Declare what the researcher is currently doing so the assistant has situational
 * context (e.g. "the study X is selected"). Set on mount, cleared on unmount.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDeclareAssistantContext(context: string | null): void {
  const { setPageContext } = useAssistant();
  useEffect(() => {
    setPageContext(context);
    return () => setPageContext(null);
  }, [setPageContext, context]);
}
