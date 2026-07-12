import { useCallback, useEffect, useState } from "react";

import type { ComparableSession } from "@/application/ports/mri-comparison-reader";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useMriComparisonService } from "./mri-comparison-service-context";

export type ComparableSessionsState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sessions: ComparableSession[] };

/**
 * Loads the MRI sessions that can be compared (those with an attached, viewable
 * image). In the browser preview it never touches the database ("unavailable").
 */
export function useComparableSessions() {
  const service = useMriComparisonService();
  const [state, setState] = useState<ComparableSessionsState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const sessions = await service.listComparableSessions();
      setState({ status: "ready", sessions });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't load the MRI sessions. Please try again.",
        ),
      });
    }
  }, [service]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
