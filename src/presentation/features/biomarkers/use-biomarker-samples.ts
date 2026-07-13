import { useCallback, useEffect, useState } from "react";

import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useBiomarkerService } from "./biomarker-service-context";

export type BiomarkerSamplesState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; samples: BiomarkerSample[] };

/**
 * Loads the biomarker samples for a timeline event. In the browser preview it never
 * touches the database — it reports "unavailable" so the UI degrades honestly.
 */
export function useBiomarkerSamples(timelineEventId: string) {
  const service = useBiomarkerService();
  const [state, setState] = useState<BiomarkerSamplesState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const samples = await service.listSamples(timelineEventId);
      setState({ status: "ready", samples });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the biomarker samples. Please try again.",
        ),
      });
    }
  }, [service, timelineEventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
