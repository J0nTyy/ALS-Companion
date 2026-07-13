import { useEffect, useState } from "react";

import type { Annotation } from "@/domain/entities/annotation";
import type { AnnotationLink } from "@/domain/entities/annotation-link";
import { isTauri } from "@/infrastructure/platform/environment";
import { useAnnotationService } from "@/presentation/features/annotations/annotation-service-context";
import { useAnnotationLinkService } from "@/presentation/features/annotation-links/annotation-link-service-context";

export interface ComparisonAnnotations {
  left: Annotation[];
  right: Annotation[];
  /** All links touching either side's annotations (used to find cross-pane pairs). */
  links: AnnotationLink[];
}

const EMPTY: ComparisonAnnotations = { left: [], right: [], links: [] };

/**
 * Loads the annotations on both compared images plus the links among them, so the
 * comparison workspace can highlight the same structure across sessions. Read-only:
 * comparison never edits annotations. Desktop-only (empty in the browser preview).
 */
export function useComparisonAnnotations(
  leftStoredFileId: string | null,
  rightStoredFileId: string | null,
): ComparisonAnnotations {
  const annotations = useAnnotationService();
  const links = useAnnotationLinkService();
  const [state, setState] = useState<ComparisonAnnotations>(EMPTY);

  useEffect(() => {
    if (!isTauri() || !leftStoredFileId || !rightStoredFileId) {
      setState(EMPTY);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const [left, right] = await Promise.all([
          annotations.listByStoredFile(leftStoredFileId),
          annotations.listByStoredFile(rightStoredFileId),
        ]);
        const ids = [...left, ...right].map((a) => a.id);
        const linkRows =
          ids.length > 0 ? await links.listLinksForAnnotations(ids) : [];
        if (active) setState({ left, right, links: linkRows });
      } catch {
        if (active) setState(EMPTY);
      }
    })();
    return () => {
      active = false;
    };
  }, [annotations, links, leftStoredFileId, rightStoredFileId]);

  return state;
}
