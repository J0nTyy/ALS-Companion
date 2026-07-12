import type { ReactNode } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";

import type { TimelineEventSummary } from "@/application/ports/dashboard-reader";
import type { DueWork } from "@/application/use-cases/dashboard/dashboard-view";
import { formatDateOnly } from "@/shared/lib/format";
import { animalRoute } from "@/application/use-cases/dashboard/dashboard-view";
import { SummaryList } from "./summary-list";

/**
 * "Today's Work" — derived only from existing planned/completed dates: what's
 * overdue, what's planned for today, and what was completed recently. No
 * scheduling or notifications.
 */
export function TodaysWork({ dueWork }: { dueWork: DueWork }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <CalendarClock className="h-4 w-4 text-primary" />
        Today's work
      </h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Bucket
          icon={<AlertTriangle className="h-4 w-4 text-warning-foreground" />}
          label="Overdue"
          events={dueWork.overdue}
          dateOf={(e) => e.plannedDate}
          emptyText="Nothing overdue."
        />
        <Bucket
          icon={<CalendarClock className="h-4 w-4 text-primary" />}
          label="Planned today"
          events={dueWork.today}
          dateOf={(e) => e.plannedDate}
          emptyText="Nothing planned for today."
        />
        <Bucket
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="Recently completed"
          events={dueWork.recentlyCompleted}
          dateOf={(e) => e.completedDate}
          emptyText="Nothing completed recently."
        />
      </div>
    </section>
  );
}

function Bucket({
  icon,
  label,
  events,
  dateOf,
  emptyText,
}: {
  icon: ReactNode;
  label: string;
  events: TimelineEventSummary[];
  dateOf: (event: TimelineEventSummary) => string | undefined;
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
        <span className="tabular-nums">{events.length}</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <SummaryList
          rows={events.map((event) => {
            const date = dateOf(event);
            return {
              key: event.id,
              title: event.title,
              subtitle: event.animalIdentifier,
              to: animalRoute(event.studyId, event.animalId),
              ...(date ? { meta: formatDateOnly(date) } : {}),
            };
          })}
        />
      )}
    </div>
  );
}
