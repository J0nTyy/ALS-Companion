import { useCallback, useEffect, useState } from "react";

import type { TimelineEvent } from "@/domain/entities/timeline-event";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useTimelineEventsService } from "./timeline-events-service-context";

export type TimelineListState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; events: TimelineEvent[] };

/**
 * Loads an animal's timeline events (most-recent activity first). In the browser
 * preview it never touches the database — it reports "unavailable" so the UI
 * degrades honestly. (In practice this only mounts on desktop.)
 */
export function useTimelineEvents(animalId: string) {
  const service = useTimelineEventsService();
  const [state, setState] = useState<TimelineListState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const events = await service.listByAnimal(animalId);
      setState({ status: "ready", events });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the timeline for this animal. Please try again.",
        ),
      });
    }
  }, [service, animalId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
