import { useState } from "react";
import { Plus, Scan } from "lucide-react";

import type { MRISession } from "@/domain/entities/mri-session";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import {
  MriSessionForm,
  type MriSessionFormValues,
} from "./components/mri-session-form";
import { MriSessionDetails } from "./components/mri-session-details";
import { useMriSessions } from "./use-mri-sessions";
import { useMriSessionService } from "./mri-session-service-context";

type PanelMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; session: MRISession };

/**
 * The MRI Session panel shown beneath a timeline event of category "MRI". Stores
 * session metadata only (no image upload/viewer/annotations — those are future
 * subsystems). Archived studies are read-only.
 */
export function MriSessionPanel({
  timelineEventId,
  readOnly = false,
}: {
  timelineEventId: string;
  readOnly?: boolean;
}) {
  const service = useMriSessionService();
  const { state, reload } = useMriSessions(timelineEventId);
  const [mode, setMode] = useState<PanelMode>({ kind: "list" });

  const effectiveMode: PanelMode = readOnly ? { kind: "list" } : mode;

  async function handleCreate(values: MriSessionFormValues) {
    await service.create({
      timelineEventId,
      title: values.title,
      modality: values.modality,
      acquisitionDate: values.acquisitionDate,
      anatomicalRegion: values.anatomicalRegion,
      operator: values.operator,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: MriSessionFormValues) {
    await service.update({
      id,
      title: values.title,
      modality: values.modality,
      acquisitionDate: values.acquisitionDate,
      anatomicalRegion: values.anatomicalRegion,
      operator: values.operator,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  const addButton = (
    <Button size="sm" onClick={() => setMode({ kind: "create" })}>
      <Plus />
      Add MRI session
    </Button>
  );

  return (
    <div className="ml-3 space-y-3 border-l-2 border-primary/20 pl-4">
      <div className="flex items-center gap-2 pt-1 text-sm font-medium text-foreground">
        <Scan className="h-4 w-4 text-primary" />
        MRI session
      </div>

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          MRI sessions are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading MRI sessions…</p>
      ) : null}

      {state.status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "create" ? (
        <Card>
          <CardContent className="pt-6">
            <MriSessionForm
              submitLabel="Save session"
              onSubmit={handleCreate}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "edit" ? (
        <Card>
          <CardContent className="pt-6">
            <MriSessionForm
              initialValues={{
                title: effectiveMode.session.title,
                modality: effectiveMode.session.modality,
                acquisitionDate: effectiveMode.session.acquisitionDate,
                ...(effectiveMode.session.anatomicalRegion !== undefined
                  ? { anatomicalRegion: effectiveMode.session.anatomicalRegion }
                  : {}),
                ...(effectiveMode.session.operator !== undefined
                  ? { operator: effectiveMode.session.operator }
                  : {}),
                ...(effectiveMode.session.notes !== undefined
                  ? { notes: effectiveMode.session.notes }
                  : {}),
              }}
              submitLabel="Save changes"
              onSubmit={(values) =>
                handleUpdate(effectiveMode.session.id, values)
              }
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "list" ? (
        state.sessions.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              No MRI session recorded for this event yet.
            </p>
            {readOnly ? null : addButton}
          </div>
        ) : (
          <div className="space-y-3">
            {state.sessions.map((session) => (
              <MriSessionDetails
                key={session.id}
                session={session}
                readOnly={readOnly}
                {...(readOnly
                  ? {}
                  : { onEdit: () => setMode({ kind: "edit", session }) })}
              />
            ))}
            {readOnly ? null : <div>{addButton}</div>}
          </div>
        )
      ) : null}
    </div>
  );
}
