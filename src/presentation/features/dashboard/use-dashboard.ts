import { useCallback, useEffect, useState } from "react";

import type { DashboardViewModel } from "@/application/use-cases/dashboard/dashboard-view";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useDashboardService } from "./dashboard-service-context";

export type DashboardState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardViewModel };

/**
 * Loads the dashboard view model. In the browser preview it never touches the
 * database ("unavailable"); the dashboard summarizes only real, existing data.
 */
export function useDashboard() {
  const service = useDashboardService();
  const [state, setState] = useState<DashboardState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const data = await service.load();
      setState({ status: "ready", data });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't load your dashboard. Please try again.",
        ),
      });
    }
  }, [service]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
