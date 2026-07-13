/**
 * Pure selection helpers for the Publication Workspace. Selection is a plain set
 * of ids per entity type, so it is easy to test and serialize.
 */
import type {
  SelectionKey,
  WorkspaceSelection,
  WorkspaceStudyContents,
} from "./publication-package";

export function emptySelection(): WorkspaceSelection {
  return {
    animalIds: [],
    timelineEventIds: [],
    observationIds: [],
    mriSessionIds: [],
    researchAssetIds: [],
  };
}

/** Everything in the study selected — the default when a study is loaded. */
export function fullSelection(
  contents: WorkspaceStudyContents,
): WorkspaceSelection {
  return {
    animalIds: contents.animals.map((a) => a.id),
    timelineEventIds: contents.timelineEvents.map((e) => e.id),
    observationIds: contents.observations.map((o) => o.id),
    mriSessionIds: contents.mriSessions.map((m) => m.id),
    researchAssetIds: contents.researchAssets.map((r) => r.id),
  };
}

export function isSelected(
  selection: WorkspaceSelection,
  key: SelectionKey,
  id: string,
): boolean {
  return selection[key].includes(id);
}

/** Add or remove a single id from one section. */
export function toggleSelection(
  selection: WorkspaceSelection,
  key: SelectionKey,
  id: string,
): WorkspaceSelection {
  const set = new Set(selection[key]);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return { ...selection, [key]: [...set] };
}

/** Replace one section's ids wholesale (used by select-all / clear). */
export function setSectionSelection(
  selection: WorkspaceSelection,
  key: SelectionKey,
  ids: readonly string[],
): WorkspaceSelection {
  return { ...selection, [key]: [...ids] };
}

/** Total number of selected items across all sections. */
export function selectionSize(selection: WorkspaceSelection): number {
  return (
    selection.animalIds.length +
    selection.timelineEventIds.length +
    selection.observationIds.length +
    selection.mriSessionIds.length +
    selection.researchAssetIds.length
  );
}
