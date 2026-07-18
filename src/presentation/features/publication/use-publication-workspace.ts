import { useCallback, useEffect, useMemo, useState } from "react";

import type { Study } from "@/domain/entities/study";
import type {
  PackagePreview,
  PublicationPackage,
  SelectionKey,
  WorkspaceSelection,
  WorkspaceStudyContents,
} from "@/application/use-cases/publication/publication-package";
import { assemblePackage } from "@/application/use-cases/publication/assemble-package";
import { previewPackage } from "@/application/use-cases/publication/package-preview";
import {
  emptySelection,
  fullSelection,
  setSectionSelection,
  toggleSelection,
} from "@/application/use-cases/publication/workspace-selection";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { onStudySummaryChanged } from "@/presentation/lib/study-events";
import { usePublicationService } from "./publication-service-context";

export type StudiesState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; studies: Study[] };

export type ContentsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; contents: WorkspaceStudyContents };

export interface PublicationWorkspace {
  studies: StudiesState;
  studyId: string | null;
  contents: ContentsState;
  selection: WorkspaceSelection;
  package: PublicationPackage | null;
  preview: PackagePreview;
  reloadStudies: () => Promise<void>;
  selectStudy: (studyId: string | null) => Promise<void>;
  toggleItem: (key: SelectionKey, id: string) => void;
  setSection: (key: SelectionKey, ids: readonly string[]) => void;
  /** The editor's working draft — this is what the preview + export use. */
  draftSummary: string;
  /** Update the working draft (live; does not persist). */
  setDraftSummary: (text: string) => void;
  /** Persist the current draft as the study's saved summary (for later reload). */
  saveDraftSummary: () => Promise<void>;
  /** The last saved summary, for the "load last summary" action (null if none). */
  savedSummary: string | null;
  /** ISO time the summary was last saved (null if never). */
  savedSummaryAt: string | null;
}

/**
 * Drives the Publication Workspace: loads the study list, loads a chosen study's
 * contents, holds the selection (defaulting to everything), and derives the live
 * in-memory package + preview. Desktop-only (reports "unavailable" in the browser).
 */
export function usePublicationWorkspace(): PublicationWorkspace {
  const service = usePublicationService();
  const [studies, setStudies] = useState<StudiesState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );
  const [studyId, setStudyId] = useState<string | null>(null);
  const [contents, setContents] = useState<ContentsState>({ status: "idle" });
  const [selection, setSelection] = useState<WorkspaceSelection>(emptySelection());
  // The editor's working draft. Starts empty each time a study is selected and is
  // what the preview + export use — the saved summary is only loaded in on request.
  const [draftSummary, setDraftSummary] = useState("");

  const reloadStudies = useCallback(async () => {
    if (!isTauri()) {
      setStudies({ status: "unavailable" });
      return;
    }
    setStudies({ status: "loading" });
    try {
      const list = await service.listStudies();
      setStudies({ status: "ready", studies: list });
    } catch (error) {
      setStudies({
        status: "error",
        message: toUserMessage(error, "We couldn't load your studies."),
      });
    }
  }, [service]);

  useEffect(() => {
    void reloadStudies();
  }, [reloadStudies]);

  const selectStudy = useCallback(
    async (id: string | null) => {
      setStudyId(id);
      setSelection(emptySelection());
      setDraftSummary(""); // fresh editor for each study (the saved one loads on request)
      if (!id) {
        setContents({ status: "idle" });
        return;
      }
      setContents({ status: "loading" });
      try {
        const loaded = await service.loadStudy(id);
        setContents({ status: "ready", contents: loaded });
        setSelection(fullSelection(loaded)); // default: include everything
      } catch (error) {
        setContents({
          status: "error",
          message: toUserMessage(error, "We couldn't load that study."),
        });
      }
    },
    [service],
  );

  const currentContents = contents.status === "ready" ? contents.contents : null;
  const savedSummary = currentContents?.study.summary ?? null;
  const savedSummaryAt = currentContents?.study.summaryUpdatedAt ?? null;

  // The preview + export reflect the DRAFT (box), not the saved summary — so an empty
  // box exports no summary. Inject the draft into the study before assembling.
  const packageValue = useMemo(() => {
    if (!currentContents) return null;
    const draft = draftSummary.trim();
    const study = { ...currentContents.study };
    if (draft.length > 0) study.summary = draft;
    else delete study.summary;
    return assemblePackage({ ...currentContents, study }, selection);
  }, [currentContents, selection, draftSummary]);
  const preview = useMemo(() => previewPackage(packageValue), [packageValue]);

  const toggleItem = useCallback(
    (key: SelectionKey, id: string) =>
      setSelection((s) => toggleSelection(s, key, id)),
    [],
  );
  const setSection = useCallback(
    (key: SelectionKey, ids: readonly string[]) =>
      setSelection((s) => setSectionSelection(s, key, ids)),
    [],
  );

  // Reflect the saved summary (+ its save time) in the loaded study's in-memory
  // contents, so `savedSummary` refreshes without a reload that would reset selection.
  const applySavedSummary = useCallback((summary: string) => {
    const trimmed = summary.trim();
    const now = new Date().toISOString();
    setContents((prev) => {
      if (prev.status !== "ready") return prev;
      const study = { ...prev.contents.study };
      if (trimmed.length > 0) {
        study.summary = trimmed;
        study.summaryUpdatedAt = now;
      } else {
        delete study.summary;
        delete study.summaryUpdatedAt;
      }
      return { status: "ready", contents: { ...prev.contents, study } };
    });
  }, []);

  // Persist the current draft as the study's saved summary (for later reload).
  const saveDraftSummary = useCallback(async () => {
    if (!studyId) return;
    const text = draftSummary.trim();
    await service.saveStudySummary(studyId, text);
    applySavedSummary(text);
  }, [studyId, service, draftSummary, applySavedSummary]);

  // The AI assistant (in the app shell) can draft + save a summary for the loaded
  // study via a confirmed proposal — it writes to the DB but can't touch this local
  // state. When the study matches, load it into the editor and refresh "saved".
  useEffect(() => {
    return onStudySummaryChanged(({ studyId: changedId, summary }) => {
      if (changedId !== studyId) return;
      setDraftSummary(summary);
      applySavedSummary(summary);
    });
  }, [studyId, applySavedSummary]);

  return {
    studies,
    studyId,
    contents,
    selection,
    package: packageValue,
    preview,
    reloadStudies,
    selectStudy,
    toggleItem,
    setSection,
    draftSummary,
    setDraftSummary,
    saveDraftSummary,
    savedSummary,
    savedSummaryAt,
  };
}
