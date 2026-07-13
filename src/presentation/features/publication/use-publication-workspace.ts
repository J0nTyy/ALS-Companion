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
  const packageValue = useMemo(
    () => (currentContents ? assemblePackage(currentContents, selection) : null),
    [currentContents, selection],
  );
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
  };
}
