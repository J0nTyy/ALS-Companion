import type { Study } from "@/domain/entities/study";
import {
  isObservationKind,
  OBSERVATION_KIND_META,
} from "@/domain/entities/observation";
import { addDaysToDateOnly } from "@/domain/value-objects/date-only";
import type { DashboardSnapshot } from "@/application/ports/dashboard-reader";
import {
  animalRoute,
  studyRoute,
  type ActivityGroup,
  type ActivityItem,
} from "./dashboard-view";

const DEFAULT_ACTIVITY_LIMIT = 12;

function observationTitle(kind: string): string {
  return isObservationKind(kind) ? OBSERVATION_KIND_META[kind].label : kind;
}

/**
 * Merge the recent items of every entity into a single activity feed, newest
 * first, de-duplicated. Reuses existing entities and their `updatedAt` — it never
 * fabricates events or timestamps.
 */
export function buildRecentActivity(
  input: { studies: readonly Study[]; snapshot: DashboardSnapshot },
  limit: number = DEFAULT_ACTIVITY_LIMIT,
): ActivityItem[] {
  const { snapshot } = input;
  const items: ActivityItem[] = [];

  for (const s of input.studies) {
    items.push({
      type: "study",
      id: s.id,
      title: s.name,
      subtitle: s.strain,
      route: studyRoute(s.id),
      timestamp: s.updatedAt,
    });
  }
  for (const a of snapshot.recentAnimals) {
    items.push({
      type: "animal",
      id: a.id,
      title: a.animalIdentifier,
      subtitle: a.studyName,
      route: animalRoute(a.studyId, a.id),
      timestamp: a.updatedAt,
    });
  }
  for (const e of [...snapshot.plannedEvents, ...snapshot.recentCompletedEvents]) {
    items.push({
      type: "timeline_event",
      id: e.id,
      title: e.title,
      subtitle: e.animalIdentifier,
      route: animalRoute(e.studyId, e.animalId),
      timestamp: e.updatedAt,
    });
  }
  for (const o of snapshot.recentObservations) {
    items.push({
      type: "observation",
      id: o.id,
      title: observationTitle(o.kind),
      subtitle: o.animalIdentifier,
      route: animalRoute(o.studyId, o.animalId),
      timestamp: o.updatedAt,
    });
  }
  for (const m of snapshot.recentMriSessions) {
    items.push({
      type: "mri_session",
      id: m.id,
      title: m.title,
      subtitle: m.animalIdentifier,
      route: animalRoute(m.studyId, m.animalId),
      timestamp: m.updatedAt,
    });
  }
  for (const r of snapshot.recentResearchAssets) {
    items.push({
      type: "research_asset",
      id: r.id,
      title: r.title,
      subtitle: r.animalIdentifier,
      route: animalRoute(r.studyId, r.animalId),
      timestamp: r.updatedAt,
    });
  }

  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return unique.slice(0, limit);
}

/**
 * Group a sorted activity list by day. `label` is "Today"/"Yesterday" for those
 * days (compared against the local `today`), otherwise the `YYYY-MM-DD` key — the
 * presentation formats non-relative days. Assumes `items` are already sorted
 * newest-first.
 */
export function groupActivityByDay(
  items: readonly ActivityItem[],
  today: string,
): ActivityGroup[] {
  const yesterday = addDaysToDateOnly(today, -1);
  const groups: ActivityGroup[] = [];
  let current: ActivityGroup | null = null;

  for (const item of items) {
    const key = item.timestamp.slice(0, 10);
    if (!current || current.key !== key) {
      const label: string =
        key === today ? "Today" : key === yesterday ? "Yesterday" : key;
      current = { key, label, items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}
