import type { QuickAction } from "./dashboard-view";

/**
 * The dashboard's quick actions, all pointing at EXISTING routes (never invented).
 * Adding an animal, recording an observation, and creating an MRI session all begin
 * inside a study, so those shortcuts open the current study (or the studies list
 * when there is no current study) rather than a route that doesn't exist.
 */
export function resolveQuickActions(
  currentStudyId: string | null,
): QuickAction[] {
  const studyBase = currentStudyId ? `/studies/${currentStudyId}` : "/studies";
  return [
    { id: "new-study", label: "New study", to: "/studies/new" },
    { id: "new-animal", label: "New animal", to: studyBase },
    { id: "record-observation", label: "Record observation", to: studyBase },
    { id: "create-mri-session", label: "Create MRI session", to: studyBase },
    { id: "compare-mri", label: "Compare MRI", to: "/compare" },
    { id: "search", label: "Search", to: "/search" },
  ];
}
