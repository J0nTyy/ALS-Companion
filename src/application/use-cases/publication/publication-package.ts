/**
 * Types for the Publication Workspace (v1.3). It assembles an IN-MEMORY,
 * structured research bundle from EXISTING entities so a researcher can prepare a
 * publication-ready package. This milestone does not export, generate documents,
 * or run statistics — it aggregates metadata + file references only. Framework-free.
 */
import type { Study } from "@/domain/entities/study";
import type { Animal } from "@/domain/entities/animal";
import type { Observation } from "@/domain/entities/observation";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { MRISession } from "@/domain/entities/mri-session";
import type { ResearchAsset } from "@/domain/entities/research-asset";
import type { StoredFile } from "@/domain/entities/stored-file";
import type { ProtocolWithSteps } from "@/domain/entities/protocol-template";
import type { Annotation } from "@/domain/entities/annotation";
import type { AnnotationLink } from "@/domain/entities/annotation-link";
import type { Measurement } from "@/domain/measurements/measurement-engine";

/**
 * The full contents of one study, loaded so the researcher can choose what to
 * include. Flat lists — each entity carries its own parent id.
 */
export interface WorkspaceStudyContents {
  study: Study;
  protocol: ProtocolWithSteps | null;
  animals: Animal[];
  timelineEvents: TimelineEvent[];
  observations: Observation[];
  mriSessions: MRISession[];
  researchAssets: ResearchAsset[];
  storedFiles: StoredFile[];
  /** Annotations across the study's stored images (v1.7). */
  annotations: Annotation[];
  /** Longitudinal links among those annotations (v1.7). */
  annotationLinks: AnnotationLink[];
}

/** An annotation paired with its DERIVED (normalized) measurement (v1.6 engine). */
export interface AnnotationMeasurement {
  annotationId: string;
  measurement: Measurement;
}

/** The ids the researcher has chosen to include, per selectable entity type. */
export interface WorkspaceSelection {
  animalIds: string[];
  timelineEventIds: string[];
  observationIds: string[];
  mriSessionIds: string[];
  researchAssetIds: string[];
}

/** Which `WorkspaceSelection` list a selectable entity belongs to. */
export type SelectionKey = keyof WorkspaceSelection;

/**
 * The assembled research bundle held in memory. Study metadata and the protocol
 * are always included; the rest reflect the selection. Stored files are references
 * (path + metadata), never bytes.
 */
export interface PublicationPackage {
  study: Study;
  protocol: ProtocolWithSteps | null;
  animals: Animal[];
  timelineEvents: TimelineEvent[];
  observations: Observation[];
  mriSessions: MRISession[];
  researchAssets: ResearchAsset[];
  storedFiles: StoredFile[];
  /** Annotations on the included stored images. */
  annotations: Annotation[];
  /** Derived (normalized) measurements, one per included annotation. */
  measurements: AnnotationMeasurement[];
  /** Longitudinal links whose BOTH endpoints are included in the package. */
  annotationLinks: AnnotationLink[];
}

export interface PackageSection {
  key: string;
  label: string;
  count: number;
}

/** A live summary of the package for the preview panel. */
export interface PackagePreview {
  studyName: string;
  sections: PackageSection[];
  /** Total across all sections (protocol steps + stored files included). */
  totalItems: number;
  warnings: string[];
  /** True when no selectable content (animals/events/observations/MRI/assets) is included. */
  isEmpty: boolean;
}
