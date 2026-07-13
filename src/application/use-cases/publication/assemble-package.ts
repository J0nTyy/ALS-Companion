/**
 * Pure assembly of the in-memory publication package from a study's loaded
 * contents + the current selection. It filters existing entities — it never
 * fabricates content. Study metadata and the protocol are always included;
 * stored-file references follow their selected research asset.
 */
import { measureAnnotation } from "@/domain/measurements/measurement-engine";
import type {
  PublicationPackage,
  WorkspaceSelection,
  WorkspaceStudyContents,
} from "./publication-package";

export function assemblePackage(
  contents: WorkspaceStudyContents,
  selection: WorkspaceSelection,
): PublicationPackage {
  const animals = new Set(selection.animalIds);
  const events = new Set(selection.timelineEventIds);
  const observations = new Set(selection.observationIds);
  const sessions = new Set(selection.mriSessionIds);
  const assets = new Set(selection.researchAssetIds);

  // A stored file is included only if its research asset is included.
  const storedFiles = contents.storedFiles.filter((f) =>
    assets.has(f.researchAssetId),
  );
  const includedFileIds = new Set(storedFiles.map((f) => f.id));

  // Annotations follow their stored image; measurements are DERIVED from geometry
  // (normalized — no image dimensions in an export context, never fabricated).
  const annotations = contents.annotations.filter((a) =>
    includedFileIds.has(a.storedFileId),
  );
  const includedAnnotationIds = new Set(annotations.map((a) => a.id));
  const measurements = annotations.map((a) => ({
    annotationId: a.id,
    measurement: measureAnnotation(a.geometry),
  }));
  // A link is included only when BOTH annotations are in the package (self-contained).
  const annotationLinks = contents.annotationLinks.filter(
    (l) =>
      includedAnnotationIds.has(l.sourceAnnotationId) &&
      includedAnnotationIds.has(l.targetAnnotationId),
  );

  return {
    study: contents.study,
    protocol: contents.protocol,
    animals: contents.animals.filter((a) => animals.has(a.id)),
    timelineEvents: contents.timelineEvents.filter((e) => events.has(e.id)),
    observations: contents.observations.filter((o) => observations.has(o.id)),
    mriSessions: contents.mriSessions.filter((m) => sessions.has(m.id)),
    researchAssets: contents.researchAssets.filter((r) => assets.has(r.id)),
    storedFiles,
    annotations,
    measurements,
    annotationLinks,
  };
}
