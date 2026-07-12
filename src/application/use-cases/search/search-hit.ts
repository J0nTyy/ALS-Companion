import type { SearchHit } from "@/application/ports/search";
import { STUDY_STATUS_META, type StudyStatus } from "@/domain/entities/study";
import {
  TIMELINE_EVENT_CATEGORY_META,
  TIMELINE_EVENT_STATUS_META,
  type TimelineEventCategory,
  type TimelineEventStatus,
} from "@/domain/entities/timeline-event";
import {
  MRI_MODALITY_META,
  type MriModality,
} from "@/domain/entities/mri-session";
import {
  OBSERVATION_KIND_META,
  type ObservationKind,
} from "@/domain/entities/observation";
import {
  RESEARCH_ASSET_STATUS_META,
  RESEARCH_ASSET_TYPE_META,
  type ResearchAssetStatus,
  type ResearchAssetType,
} from "@/domain/entities/research-asset";

/**
 * Pure builders that turn an entity's fields into a normalized {@link SearchHit}
 * (title, subtitle, in-app route). Centralizing route + label formatting here
 * keeps the infrastructure readers to plain SQL and makes navigation targets and
 * display strings unit-testable in one place.
 */

/** Route to a study's detail page. */
export function studyDetailRoute(studyId: string): string {
  return `/studies/${studyId}`;
}

/** Route to an animal's detail page (where its observations/timeline/MRI live). */
export function animalDetailRoute(studyId: string, animalId: string): string {
  return `/studies/${studyId}/animals/${animalId}`;
}

/** Join the present, non-empty parts of a subtitle with a middot separator. */
function subtitleOf(parts: Array<string | undefined>): string | undefined {
  const kept = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return kept.length > 0 ? kept.join(" · ") : undefined;
}

function makeHit(
  type: SearchHit["type"],
  id: string,
  title: string,
  route: string,
  subtitle: string | undefined,
): SearchHit {
  return {
    type,
    id,
    title,
    route,
    ...(subtitle ? { subtitle } : {}),
  };
}

export function studyHit(row: {
  id: string;
  name: string;
  strain: string;
  status: StudyStatus;
}): SearchHit {
  return makeHit(
    "study",
    row.id,
    row.name,
    studyDetailRoute(row.id),
    subtitleOf([STUDY_STATUS_META[row.status].label, row.strain]),
  );
}

export function animalHit(row: {
  id: string;
  studyId: string;
  identifier: string;
  studyName: string;
  mutation?: string;
  treatmentGroup?: string;
}): SearchHit {
  return makeHit(
    "animal",
    row.id,
    row.identifier,
    animalDetailRoute(row.studyId, row.id),
    subtitleOf([row.mutation, row.treatmentGroup, row.studyName]),
  );
}

export function protocolTemplateHit(row: {
  id: string;
  studyId: string;
  name: string;
  studyName: string;
}): SearchHit {
  return makeHit(
    "protocol_template",
    row.id,
    row.name,
    studyDetailRoute(row.studyId),
    subtitleOf(["Protocol", row.studyName]),
  );
}

export function timelineEventHit(row: {
  id: string;
  studyId: string;
  animalId: string;
  title: string;
  category: TimelineEventCategory;
  status: TimelineEventStatus;
  animalIdentifier: string;
}): SearchHit {
  return makeHit(
    "timeline_event",
    row.id,
    row.title,
    animalDetailRoute(row.studyId, row.animalId),
    subtitleOf([
      TIMELINE_EVENT_CATEGORY_META[row.category].label,
      TIMELINE_EVENT_STATUS_META[row.status].label,
      row.animalIdentifier,
    ]),
  );
}

export function mriSessionHit(row: {
  id: string;
  studyId: string;
  animalId: string;
  title: string;
  modality: MriModality;
  animalIdentifier: string;
}): SearchHit {
  return makeHit(
    "mri_session",
    row.id,
    row.title,
    animalDetailRoute(row.studyId, row.animalId),
    subtitleOf([MRI_MODALITY_META[row.modality].label, row.animalIdentifier]),
  );
}

export function observationHit(row: {
  id: string;
  studyId: string;
  animalId: string;
  kind: ObservationKind;
  observedOn: string;
  animalIdentifier: string;
}): SearchHit {
  return makeHit(
    "observation",
    row.id,
    OBSERVATION_KIND_META[row.kind].label,
    animalDetailRoute(row.studyId, row.animalId),
    subtitleOf([row.observedOn, row.animalIdentifier]),
  );
}

export function researchAssetHit(row: {
  id: string;
  studyId: string;
  animalId: string;
  title: string;
  assetType: ResearchAssetType;
  status: ResearchAssetStatus;
  animalIdentifier: string;
}): SearchHit {
  return makeHit(
    "research_asset",
    row.id,
    row.title,
    animalDetailRoute(row.studyId, row.animalId),
    subtitleOf([
      RESEARCH_ASSET_TYPE_META[row.assetType].label,
      RESEARCH_ASSET_STATUS_META[row.status].label,
      row.animalIdentifier,
    ]),
  );
}
