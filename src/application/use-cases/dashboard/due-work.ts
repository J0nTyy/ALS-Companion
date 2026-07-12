import { addDaysToDateOnly } from "@/domain/value-objects/date-only";
import type { TimelineEventSummary } from "@/application/ports/dashboard-reader";
import type { DueWork } from "./dashboard-view";

/** How far back a completed event still counts as "recently completed". */
const RECENTLY_COMPLETED_WINDOW_DAYS = 7;

/**
 * Bucket timeline events into Today's Work using ONLY their existing planned /
 * completed dates (no scheduling logic invented):
 * - today: planned events whose planned date is today,
 * - overdue: planned events whose planned date is before today,
 * - recentlyCompleted: completed events completed within the last week.
 *
 * All dates are local `YYYY-MM-DD` strings, so lexical comparison is correct.
 */
export function computeDueWork(
  plannedEvents: readonly TimelineEventSummary[],
  completedEvents: readonly TimelineEventSummary[],
  today: string,
): DueWork {
  const todayEvents = plannedEvents.filter((e) => e.plannedDate === today);
  const overdue = plannedEvents.filter(
    (e) => e.plannedDate !== undefined && e.plannedDate < today,
  );

  const cutoff = addDaysToDateOnly(today, -RECENTLY_COMPLETED_WINDOW_DAYS);
  const recentlyCompleted = completedEvents.filter(
    (e) => e.completedDate !== undefined && e.completedDate >= cutoff,
  );

  return { today: todayEvents, overdue, recentlyCompleted };
}
