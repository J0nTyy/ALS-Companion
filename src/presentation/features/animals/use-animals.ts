import { useCallback, useEffect, useState } from "react";

import type { Animal } from "@/domain/entities/animal";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useAnimalsService } from "./animals-service-context";

export type AnimalsListState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; animals: Animal[] };

/**
 * Loads the animals for a study. In the browser preview it never touches the
 * database — it reports "unavailable" so the UI degrades honestly. (In practice
 * this only mounts on desktop, since the study detail is itself desktop-gated.)
 */
export function useAnimals(studyId: string) {
  const service = useAnimalsService();
  const [state, setState] = useState<AnimalsListState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const animals = await service.listByStudy(studyId);
      setState({ status: "ready", animals });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the animals for this study. Please try again.",
        ),
      });
    }
  }, [service, studyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
