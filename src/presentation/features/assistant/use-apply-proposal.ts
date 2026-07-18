import { useCallback } from "react";

import type { AgentProposal } from "@/application/ai/agent-proposals";
import { emitStudySummaryChanged } from "@/presentation/lib/study-events";
import { useObservationsService } from "@/presentation/features/observations/observations-service-context";
import { useTimelineEventsService } from "@/presentation/features/timeline/timeline-events-service-context";
import { useBiomarkerService } from "@/presentation/features/biomarkers/biomarker-service-context";
import { useStudiesService } from "@/presentation/features/studies/studies-service-context";

/**
 * Turns a confirmed {@link AgentProposal} into a real record by calling the same
 * create use-case the manual UI uses. This is the ONLY place a proposal becomes a
 * write — and it only runs when the researcher clicks "Add" on the confirmation
 * card, never from the agent loop.
 */
export function useApplyProposal(): (proposal: AgentProposal) => Promise<void> {
  const observations = useObservationsService();
  const timeline = useTimelineEventsService();
  const biomarker = useBiomarkerService();
  const studies = useStudiesService();

  return useCallback(
    async (proposal: AgentProposal) => {
      switch (proposal.type) {
        case "observation":
          await observations.create(proposal.input);
          return;
        case "timeline_event":
          await timeline.create(proposal.input);
          return;
        case "biomarker_result":
          await biomarker.createResult(proposal.input);
          return;
        case "study_summary":
          await studies.setSummary(proposal.input.studyId, proposal.input.summary);
          // Let an open Publication Workspace reflect it in the box + preview + export.
          emitStudySummaryChanged({
            studyId: proposal.input.studyId,
            summary: proposal.input.summary,
          });
          return;
      }
    },
    [observations, timeline, biomarker, studies],
  );
}
