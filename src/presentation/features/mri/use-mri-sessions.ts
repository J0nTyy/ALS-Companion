import { useCallback, useEffect, useState } from "react";

import type { MRISession } from "@/domain/entities/mri-session";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useMriSessionService } from "./mri-session-service-context";

export type MriSessionsState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sessions: MRISession[] };

/**
 * Loads the MRI sessions for a timeline event. In the browser preview it never
 * touches the database — it reports "unavailable" so the UI degrades honestly.
 */
export function useMriSessions(timelineEventId: string) {
  const service = useMriSessionService();
  const [state, setState] = useState<MriSessionsState>(() =>
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
          "We couldn't open the MRI sessions. Please try again.",
        ),
      });
    }
  }, [service, timelineEventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
