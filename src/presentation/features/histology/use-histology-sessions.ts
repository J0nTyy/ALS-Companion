import { useCallback, useEffect, useState } from "react";

import type { HistologySession } from "@/domain/entities/histology-session";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useHistologySessionService } from "./histology-session-service-context";

export type HistologySessionsState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sessions: HistologySession[] };

/**
 * Loads the histology sessions for a timeline event. In the browser preview it
 * never touches the database — it reports "unavailable" so the UI degrades
 * honestly. Mirrors {@link useMriSessions}.
 */
export function useHistologySessions(timelineEventId: string) {
  const service = useHistologySessionService();
  const [state, setState] = useState<HistologySessionsState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const sessions = await service.listByTimelineEvent(timelineEventId);
      setState({ status: "ready", sessions });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the histology sessions. Please try again.",
        ),
      });
    }
  }, [service, timelineEventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
