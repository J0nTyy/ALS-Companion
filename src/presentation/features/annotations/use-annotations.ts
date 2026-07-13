import { useCallback, useEffect, useState } from "react";

import type { Annotation } from "@/domain/entities/annotation";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useAnnotationService } from "./annotation-service-context";

export type AnnotationsState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; annotations: Annotation[] };

/**
 * Loads the annotations for one stored image, with reload. In the browser preview
 * it never touches the database ("unavailable"). Kept small: the viewer owns
 * selection/draw state; this hook owns only the persisted list.
 */
export function useAnnotations(storedFileId: string) {
  const service = useAnnotationService();
  const [state, setState] = useState<AnnotationsState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isTauri()) {
        setState({ status: "unavailable" });
        return;
      }
      // A silent refresh (after a create/edit/delete) keeps the current list on
      // screen while re-fetching, so the viewer never remounts and the selection
      // and zoom/pan survive. Only the first load shows the "loading" state.
      if (!options?.silent) setState({ status: "loading" });
      try {
        const annotations = await service.listByStoredFile(storedFileId);
        setState({ status: "ready", annotations });
      } catch (error) {
        setState({
          status: "error",
          message: toUserMessage(
            error,
            "We couldn't load the annotations. Please try again.",
          ),
        });
      }
    },
    [service, storedFileId],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
