import { useCallback, useEffect, useState } from "react";

import type { Study } from "@/domain/entities/study";
import { isTauri } from "@/infrastructure/platform/environment";
import { useStudiesService } from "./studies-service-context";
import { toUserMessage } from "./error-message";

export type StudiesListState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; studies: Study[] };

/**
 * Loads the studies list and keeps it in sync with the "show archived" toggle.
 * In the browser preview it never touches the database — it reports
 * "unavailable" so the UI can explain that saving needs the desktop app.
 */
export function useStudies() {
  const service = useStudiesService();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [state, setState] = useState<StudiesListState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const studies = await service.list({ includeArchived });
      setState({ status: "ready", studies });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open your studies. Please try again.",
        ),
      });
    }
  }, [service, includeArchived]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, includeArchived, setIncludeArchived, reload };
}
