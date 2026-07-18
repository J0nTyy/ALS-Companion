import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Check, ClipboardCheck, Loader2, SendHorizonal, Trash2, X } from "lucide-react";

import type { AgentProposal } from "@/application/ai/agent-proposals";
import { Button } from "@/presentation/components/ui/button";
import { Textarea } from "@/presentation/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useSettings } from "@/shared/hooks/use-settings";
import { useAssistant } from "@/presentation/features/assistant/assistant-context";
import { useApplyProposal } from "@/presentation/features/assistant/use-apply-proposal";
import {
  useAssistantChat,
  type ChatMessage,
} from "@/presentation/features/assistant/use-assistant-chat";

// Loaded on demand so react-markdown stays out of the initial bundle. Assistant
// replies render as Markdown; user input and errors stay plain text.
const AssistantMarkdown = lazy(() =>
  import("@/presentation/features/assistant/assistant-markdown").then((module) => ({
    default: module.AssistantMarkdown,
  })),
);

/**
 * The AI assistant's chat UI. Rendered inside the app's **docked right panel** (see
 * AppShell), so it fills its container rather than positioning itself. The shell
 * keeps it mounted while hidden, so the conversation survives closing/reopening;
 * `open` lets it re-check the saved API key each time the panel is shown.
 */
export function AssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { credentials, pendingQuestion, consumePending } = useAssistant();
  const { settings } = useSettings();
  const { messages, busy, send, clear } = useAssistantChat();
  const [input, setInput] = useState("");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Re-check for a saved key each time the panel opens (the user may have just
  // added one in Settings while the panel was hidden).
  useEffect(() => {
    if (!open) return;
    let active = true;
    void credentials
      .hasKey(settings.aiProvider)
      .then((value) => {
        if (active) setHasKey(value);
      })
      .catch(() => {
        if (active) setHasKey(false);
      });
    return () => {
      active = false;
    };
  }, [credentials, open, settings.aiProvider]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Send a question queued from elsewhere (e.g. the Publish page's "Draft with
  // assistant" button). Consume it first so it fires exactly once.
  useEffect(() => {
    if (!pendingQuestion) return;
    consumePending();
    void send(pendingQuestion);
  }, [pendingQuestion, consumePending, send]);

  const submit = () => {
    const question = input;
    setInput("");
    void send(question);
  };

  const keyMissing = hasKey === false;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Research assistant</p>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear conversation"
            onClick={clear}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close assistant" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {keyMissing ? <NoKeyNotice /> : null}
        {!keyMissing && messages.length === 0 ? <EmptyHint /> : null}
        {messages.map((message, index) => (
          <div key={index} className="space-y-2">
            <MessageBubble message={message} />
            {message.proposals?.map((proposal, proposalIndex) => (
              <ProposalCard key={proposalIndex} proposal={proposal} />
            ))}
          </div>
        ))}
        {busy ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Thinking…
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Ask the assistant"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={
              keyMissing
                ? "Add an API key in Settings to begin…"
                : "Ask about your studies, or how to use the app…"
            }
            rows={2}
            disabled={busy || keyMissing}
            className="min-h-0 resize-none"
          />
          <Button
            size="icon"
            aria-label="Send"
            onClick={submit}
            disabled={busy || keyMissing || input.trim() === ""}
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-tight text-muted-foreground">
          Answers come from your data via your chosen AI provider and can be wrong — verify
          anything important. Proposes changes you confirm; never sends your images; not a
          diagnostic tool.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.error
              ? "bg-destructive/10 text-foreground"
              : "bg-muted text-foreground",
        )}
      >
        {message.role === "assistant" && !message.error ? (
          <Suspense
            fallback={<p className="whitespace-pre-wrap break-words">{message.text}</p>}
          >
            <AssistantMarkdown source={message.text} />
          </Suspense>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
        )}
        {message.tools && message.tools.length > 0 ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Looked at: {message.tools.map((name) => name.replace(/_/g, " ")).join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Ask about your workspace</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>“Which animals in my newest study reached symptom onset first?”</li>
        <li>“Summarise the body-weight trend for study X.”</li>
        <li>“How do I add a histology session?”</li>
      </ul>
    </div>
  );
}

function NoKeyNotice() {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
      <p className="font-medium text-foreground">Add a free API key to begin</p>
      <p className="mt-1 text-muted-foreground">
        Add a free Google Gemini or Groq key in Settings → AI assistant to get started.
      </p>
      <Button asChild size="sm" variant="outline" className="mt-3">
        <Link to="/settings">Open Settings</Link>
      </Button>
    </div>
  );
}

type ProposalState =
  | { status: "idle" }
  | { status: "adding" }
  | { status: "added" }
  | { status: "dismissed" }
  | { status: "error"; message: string };

/**
 * A record the assistant proposed. Nothing is saved until the researcher clicks
 * Add, which calls the same create use-case the manual UI uses.
 */
function ProposalCard({ proposal }: { proposal: AgentProposal }) {
  const apply = useApplyProposal();
  const [state, setState] = useState<ProposalState>({ status: "idle" });

  if (state.status === "dismissed") return null;

  const add = async () => {
    setState({ status: "adding" });
    try {
      await apply(proposal);
      setState({ status: "added" });
    } catch (error) {
      setState({ status: "error", message: toUserMessage(error, "Could not save this record.") });
    }
  };

  const added = state.status === "added";

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="font-medium text-foreground">Add {proposal.title.toLowerCase()}?</p>
      </div>
      <dl className="mt-2 space-y-1">
        {proposal.fields.map((field, index) => (
          <div key={index} className="flex gap-2">
            <dt className="w-24 shrink-0 text-muted-foreground">{field.label}</dt>
            <dd className="min-w-0 break-words text-foreground">{field.value}</dd>
          </div>
        ))}
      </dl>
      {state.status === "error" ? (
        <p className="mt-2 text-xs text-destructive">{state.message}</p>
      ) : null}
      {added ? (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Added
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => void add()} disabled={state.status === "adding"}>
            {state.status === "adding" ? "Adding…" : "Add"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setState({ status: "dismissed" })}
            disabled={state.status === "adding"}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
