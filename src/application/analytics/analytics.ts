/**
 * Pure, deterministic cohort-analytics computations (v2.1). Framework-free — no
 * React, SQLite, Tauri, persistence, AI, or prediction. Every function maps loaded
 * entities to summary statistics; the same input always yields the same output.
 *
 * The AnalyticsService composes the EXISTING services to load the data and then
 * calls these functions. Nothing here is stored.
 */
import type { Study } from "@/domain/entities/study";
import type { Animal } from "@/domain/entities/animal";
import { STUDY_STATUSES, STUDY_STATUS_META } from "@/domain/entities/study";
import { OBSERVATION_KIND_META } from "@/domain/entities/observation";
import { TIMELINE_EVENT_CATEGORY_META } from "@/domain/entities/timeline-event";
import { HISTOLOGY_STAIN_META } from "@/domain/entities/histology-session";
import { BIOMARKER_SAMPLE_TYPE_META } from "@/domain/entities/biomarker-sample";
import type { WorkspaceStudyContents } from "@/application/use-cases/publication/publication-package";

export interface Bucket {
  label: string;
  count: number;
}

export interface AnalyticsFilters {
  treatmentGroup?: string | undefined;
  mutation?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface OverviewAnalytics {
  studies: { total: number; active: number; archived: number; byStatus: Bucket[] };
  animals: { total: number; byTreatmentGroup: Bucket[]; byMutation: Bucket[] };
}

export interface StudyAnalytics {
  studyId: string;
  studyName: string;
  animals: number;
  byTreatmentGroup: Bucket[];
  byMutation: Bucket[];
  timeline: {
    total: number;
    planned: number;
    completed: number;
    completionPct: number;
    byCategory: Bucket[];
  };
  observations: { total: number; byKind: Bucket[] };
  mri: { sessions: number; images: number };
  histology: { sessions: number; byStain: Bucket[] };
  biomarker: {
    samples: number;
    results: number;
    bySampleType: Bucket[];
    distinctBiomarkers: number;
  };
  annotations: { total: number; points: number; rectangles: number; links: number };
  measurements: { total: number; points: number; rectangles: number };
  publicationReadiness: { score: number; checks: { label: string; ok: boolean }[] };
}

// --- helpers ---
function tally(values: Array<string | undefined | null>, fallback = "—"): Bucket[] {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v && v.trim().length > 0 ? v.trim() : fallback;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function inRange(date: string, filters: AnalyticsFilters): boolean {
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  return true;
}

/** Cohort overview across all studies. */
export function computeOverview(
  studies: readonly Study[],
  animals: readonly Animal[],
): OverviewAnalytics {
  const byStatus: Bucket[] = STUDY_STATUSES.map((s) => ({
    label: STUDY_STATUS_META[s].label,
    count: studies.filter((st) => st.status === s).length,
  })).filter((b) => b.count > 0);

  return {
    studies: {
      total: studies.length,
      active: studies.filter((s) => s.status === "active").length,
      archived: studies.filter((s) => s.status === "archived").length,
      byStatus,
    },
    animals: {
      total: animals.length,
      byTreatmentGroup: tally(animals.map((a) => a.treatmentGroup), "Unassigned"),
      byMutation: tally(animals.map((a) => a.mutation), "Unspecified"),
    },
  };
}

/** Per-study statistics, honoring the treatment/mutation/date filters via a cascade
 *  from the (filtered) animal set down through every child entity. */
export function computeStudyAnalytics(
  contents: WorkspaceStudyContents,
  filters: AnalyticsFilters = {},
): StudyAnalytics {
  const animals = contents.animals.filter(
    (a) =>
      (!filters.treatmentGroup || a.treatmentGroup === filters.treatmentGroup) &&
      (!filters.mutation || a.mutation === filters.mutation),
  );
  const animalIds = new Set(animals.map((a) => a.id));

  const events = contents.timelineEvents.filter((e) => animalIds.has(e.animalId));
  const eventIds = new Set(events.map((e) => e.id));
  const observations = contents.observations.filter(
    (o) => animalIds.has(o.animalId) && inRange(o.observedOn, filters),
  );
  const mri = contents.mriSessions.filter((m) => eventIds.has(m.timelineEventId));
  const histo = contents.histologySessions.filter((h) =>
    eventIds.has(h.timelineEventId),
  );
  const samples = contents.biomarkerSamples.filter((b) =>
    eventIds.has(b.timelineEventId),
  );
  const sampleIds = new Set(samples.map((s) => s.id));
  const results = contents.biomarkerResults.filter((r) =>
    sampleIds.has(r.biomarkerSampleId),
  );
  const ownerIds = new Set<string>([
    ...mri.map((m) => m.id),
    ...histo.map((h) => h.id),
  ]);
  const assets = contents.researchAssets.filter((r) => ownerIds.has(r.ownerId));
  const assetIds = new Set(assets.map((a) => a.id));
  const files = contents.storedFiles.filter((f) =>
    assetIds.has(f.researchAssetId),
  );
  const fileIds = new Set(files.map((f) => f.id));
  const annotations = contents.annotations.filter((a) =>
    fileIds.has(a.storedFileId),
  );
  const annIds = new Set(annotations.map((a) => a.id));
  const links = contents.annotationLinks.filter(
    (l) => annIds.has(l.sourceAnnotationId) || annIds.has(l.targetAnnotationId),
  );

  const completed = events.filter((e) => e.status === "completed").length;
  const byCategory = tally(events.map((e) => TIMELINE_EVENT_CATEGORY_META[e.category].label));
  const points = annotations.filter((a) => a.annotationType === "point").length;
  const rectangles = annotations.filter((a) => a.annotationType === "rectangle").length;

  const checks = [
    { label: "Has a protocol", ok: contents.protocol !== null },
    { label: "Has animals", ok: animals.length > 0 },
    { label: "Has observations", ok: observations.length > 0 },
    { label: "Has imaging (MRI or histology)", ok: mri.length + histo.length > 0 },
    { label: "Has attached images", ok: files.length > 0 },
    { label: "Has biomarker results", ok: results.length > 0 },
    { label: "Has annotations", ok: annotations.length > 0 },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  return {
    studyId: contents.study.id,
    studyName: contents.study.name,
    animals: animals.length,
    byTreatmentGroup: tally(animals.map((a) => a.treatmentGroup), "Unassigned"),
    byMutation: tally(animals.map((a) => a.mutation), "Unspecified"),
    timeline: {
      total: events.length,
      planned: events.length - completed,
      completed,
      completionPct: events.length > 0 ? Math.round((completed / events.length) * 100) : 0,
      byCategory,
    },
    observations: {
      total: observations.length,
      byKind: tally(observations.map((o) => OBSERVATION_KIND_META[o.kind].label)),
    },
    mri: { sessions: mri.length, images: files.filter((f) => assets.find((a) => a.id === f.researchAssetId)?.ownerType === "mri_session").length },
    histology: {
      sessions: histo.length,
      byStain: tally(histo.map((h) => HISTOLOGY_STAIN_META[h.stain].label)),
    },
    biomarker: {
      samples: samples.length,
      results: results.length,
      bySampleType: tally(samples.map((s) => BIOMARKER_SAMPLE_TYPE_META[s.sampleType].label)),
      distinctBiomarkers: new Set(results.map((r) => r.biomarkerName)).size,
    },
    annotations: { total: annotations.length, points, rectangles, links: links.length },
    measurements: { total: annotations.length, points, rectangles },
    publicationReadiness: { score, checks },
  };
}

/** Distinct treatment groups / mutations present in a study (for the filter UI). */
export function studyFilterOptions(contents: WorkspaceStudyContents): {
  treatmentGroups: string[];
  mutations: string[];
} {
  const groups = new Set<string>();
  const mutations = new Set<string>();
  for (const a of contents.animals) {
    if (a.treatmentGroup) groups.add(a.treatmentGroup);
    if (a.mutation) mutations.add(a.mutation);
  }
  return {
    treatmentGroups: [...groups].sort(),
    mutations: [...mutations].sort(),
  };
}
