import { useId, useState } from "react";
import { AlertTriangle, ListChecks, Plus } from "lucide-react";

import type { TimelineEvent } from "@/domain/entities/timeline-event";
import { EmptyState } from "@/presentation/components/empty-state";
import { LoadingState } from "@/presentation/components/loading-state";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { localDateOnly } from "@/shared/lib/local-date";
import {
  TimelineEventForm,
  type TimelineEventFormValues,
} from "./components/timeline-event-form";
import { TimelineEventItem } from "./components/timeline-event-item";
import { MriSessionPanel } from "@/presentation/features/mri/mri-session-panel";
import { useTimelineEvents } from "./use-timeline-events";
import { useTimelineEventsService } from "./timeline-events-service-context";

type SectionMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; event: TimelineEvent };

/** Id of the "newest planned" event (latest planned date; else first planned). */
function newestPlannedId(events: readonly TimelineEvent[]): string | undefined {
  const planned = events.filter((event) => event.status === "planned");
  const dated = planned.filter((event) => event.plannedDate !== undefined);
  if (dated.length > 0) {
    return dated.reduce((best, event) =>
      (event.plannedDate ?? "") > (best.plannedDate ?? "") ? event : best,
    ).id;
  }
  return planned[0]?.id;
}

/**
 * The experiment timeline for one animal (contextual — no sidebar item). Lists
 * workflow events with upcoming planned steps first, distinguishes completed
 * events, and provides add / edit / mark-complete. No delete — history is
 * permanent. When `readOnly` (archived study), events stay viewable but write
 * affordances are hidden (the application layer also refuses such writes).
 */
export function TimelineSection({
  animalId,
  studyId,
  readOnly = false,
}: {
  animalId: string;
  studyId: string;
  readOnly?: boolean;
}) {
  const headingId = useId();
  const service = useTimelineEventsService();
  const { state, reload } = useTimelineEvents(animalId);
  const [mode, setMode] = useState<SectionMode>({ kind: "list" });

  const effectiveMode: SectionMode = readOnly ? { kind: "list" } : mode;

  async function handleCreate(values: TimelineEventFormValues) {
    await service.create({
      animalId,
      studyId,
      title: values.title,
      category: values.category,
      status: values.status,
      plannedDate: values.plannedDate,
      completedDate: values.completedDate,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: TimelineEventFormValues) {
    await service.update({
      id,
      title: values.title,
      category: values.category,
      status: values.status,
      plannedDate: values.plannedDate,
      completedDate: values.completedDate,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleMarkComplete(event: TimelineEvent) {
    await service.update({
      id: event.id,
      title: event.title,
      category: event.category,
      status: "completed",
      completedDate: event.completedDate ?? localDateOnly(),
      ...(event.plannedDate !== undefined
        ? { plannedDate: event.plannedDate }
        : {}),
      ...(event.notes !== undefined ? { notes: event.notes } : {}),
    });
    await reload();
  }

  const addButton = (
    <Button onClick={() => setMode({ kind: "create" })}>
      <Plus />
      Add event
    </Button>
  );

  const showAdd =
    !readOnly &&
    state.status === "ready" &&
    effectiveMode.kind === "list" &&
    state.events.length > 0;

  const highlightId =
    state.status === "ready" ? newestPlannedId(state.events) : undefined;

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex items-end justify-between gap-3 border-t border-border pt-6">
        <div>
          <h2
            id={headingId}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Experiment timeline
          </h2>
          <p className="text-sm text-muted-foreground">
            The chronological workflow of steps planned and completed for this
            animal.
          </p>
        </div>
        {showAdd ? addButton : null}
      </div>

      {readOnly && state.status === "ready" ? (
        <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This study is archived, so the timeline is read-only. Restore the study
          to add or change events.
        </p>
      ) : null}

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          The timeline is available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <LoadingState label="Loading timeline…" />
      ) : null}

      {state.status === "error" ? (
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't load the timeline"
          description={state.message}
          action={
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          }
        />
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "create" ? (
        <Card>
          <CardContent className="pt-6">
            <TimelineEventForm
              submitLabel="Save event"
              onSubmit={handleCreate}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "edit" ? (
        <Card>
          <CardContent className="pt-6">
            <TimelineEventForm
              initialValues={{
                title: effectiveMode.event.title,
                category: effectiveMode.event.category,
                status: effectiveMode.event.status,
                ...(effectiveMode.event.plannedDate !== undefined
                  ? { plannedDate: effectiveMode.event.plannedDate }
                  : {}),
                ...(effectiveMode.event.completedDate !== undefined
                  ? { completedDate: effectiveMode.event.completedDate }
                  : {}),
                ...(effectiveMode.event.notes !== undefined
                  ? { notes: effectiveMode.event.notes }
                  : {}),
              }}
              submitLabel="Save changes"
              onSubmit={(values) => handleUpdate(effectiveMode.event.id, values)}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "list" ? (
        state.events.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No timeline events yet"
            description={
              readOnly
                ? "This archived study's animal has no timeline events."
                : "Add workflow steps — gene confirmation, assessments, MRI, histopathology — to build this animal's experiment timeline."
            }
            {...(readOnly ? {} : { action: addButton })}
          />
        ) : (
          <ul className="space-y-3">
            {state.events.map((event) => (
              <li key={event.id} className="space-y-3">
                <TimelineEventItem
                  event={event}
                  highlight={event.id === highlightId}
                  {...(readOnly
                    ? {}
                    : {
                        onEdit: () => setMode({ kind: "edit", event }),
                        onMarkComplete: () => void handleMarkComplete(event),
                      })}
                />
                {event.category === "mri" ? (
                  <MriSessionPanel
                    timelineEventId={event.id}
                    readOnly={readOnly}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
