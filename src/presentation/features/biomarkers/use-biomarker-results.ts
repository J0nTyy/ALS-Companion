import { useCallback, useEffect, useState } from "react";

import type { BiomarkerResult } from "@/domain/entities/biomarker-result";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useBiomarkerService } from "./biomarker-service-context";

export type BiomarkerResultsState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; results: BiomarkerResult[] };

/** Loads the laboratory results for one biomarker sample. */
export function useBiomarkerResults(biomarkerSampleId: string) {
  const service = useBiomarkerService();
  const [state, setState] = useState<BiomarkerResultsState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const results = await service.listResults(biomarkerSampleId);
      setState({ status: "ready", results });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the biomarker results. Please try again.",
        ),
      });
    }
  }, [service, biomarkerSampleId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
