import { useCallback, useEffect, useState } from "react";

import type { Observation } from "@/domain/entities/observation";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useObservationsService } from "./observations-service-context";

export type ObservationsListState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; observations: Observation[] };

/**
 * Loads an animal's observations (most recent first). In the browser preview it
 * never touches the database — it reports "unavailable" so the UI degrades
 * honestly. (In practice this only mounts on desktop.)
 */
export function useObservations(animalId: string) {
  const service = useObservationsService();
  const [state, setState] = useState<ObservationsListState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const observations = await service.listByAnimal(animalId);
      setState({ status: "ready", observations });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the observations for this animal. Please try again.",
        ),
      });
    }
  }, [service, animalId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
