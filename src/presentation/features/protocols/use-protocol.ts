import { useCallback, useEffect, useState } from "react";

import type { ProtocolWithSteps } from "@/domain/entities/protocol-template";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useProtocolService } from "./protocol-service-context";

export type ProtocolState =
  | { status: "unavailable" } // browser preview — no database
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; protocol: ProtocolWithSteps | null };

/**
 * Loads a study's protocol (template + ordered steps), or null when the study has
 * no protocol yet. Browser preview never touches the database.
 */
export function useProtocol(studyId: string) {
  const service = useProtocolService();
  const [state, setState] = useState<ProtocolState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const protocol = await service.getForStudy(studyId);
      setState({ status: "ready", protocol });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the protocol for this study. Please try again.",
        ),
      });
    }
  }, [service, studyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
