import { useState } from "react";
import { Microscope, Plus } from "lucide-react";

import type { HistologySession } from "@/domain/entities/histology-session";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import {
  HistologySessionForm,
  type HistologySessionFormValues,
} from "./components/histology-session-form";
import { HistologySessionDetails } from "./components/histology-session-details";
import { useHistologySessions } from "./use-histology-sessions";
import { useHistologySessionService } from "./histology-session-service-context";
import { useDeletionService } from "@/presentation/features/deletion/deletion-service-context";

type PanelMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; session: HistologySession };

/**
 * The Histology Session panel shown beneath a timeline event of category
 * "Histopathology". Stores session metadata only; images attach through the shared
 * research-asset stack. Archived studies are read-only. Mirrors {@link MriSessionPanel}.
 */
export function HistologySessionPanel({
  timelineEventId,
  readOnly = false,
}: {
  timelineEventId: string;
  readOnly?: boolean;
}) {
  const service = useHistologySessionService();
  const deletion = useDeletionService();
  const { state, reload } = useHistologySessions(timelineEventId);
  const [mode, setMode] = useState<PanelMode>({ kind: "list" });

  const effectiveMode: PanelMode = readOnly ? { kind: "list" } : mode;

  async function handleCreate(values: HistologySessionFormValues) {
    await service.create({
      timelineEventId,
      stain: values.stain,
      acquisitionDate: values.acquisitionDate,
      tissue: values.tissue,
      magnification: values.magnification,
      operator: values.operator,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: HistologySessionFormValues) {
    await service.update({
      id,
      stain: values.stain,
      acquisitionDate: values.acquisitionDate,
      tissue: values.tissue,
      magnification: values.magnification,
      operator: values.operator,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  const addButton = (
    <Button size="sm" onClick={() => setMode({ kind: "create" })}>
      <Plus />
      Add histology session
    </Button>
  );

  return (
    <div className="ml-3 space-y-3 border-l-2 border-primary/20 pl-4">
      <div className="flex items-center gap-2 pt-1 text-sm font-medium text-foreground">
        <Microscope className="h-4 w-4 text-primary" />
        Histology session
      </div>

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Histology sessions are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">
          Loading histology sessions…
        </p>
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
            <HistologySessionForm
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
            <HistologySessionForm
              initialValues={{
                stain: effectiveMode.session.stain,
                acquisitionDate: effectiveMode.session.acquisitionDate,
                ...(effectiveMode.session.tissue !== undefined
                  ? { tissue: effectiveMode.session.tissue }
                  : {}),
                ...(effectiveMode.session.magnification !== undefined
                  ? { magnification: effectiveMode.session.magnification }
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
              No histology session recorded for this event yet.
            </p>
            {readOnly ? null : addButton}
          </div>
        ) : (
          <div className="space-y-3">
            {state.sessions.map((session) => (
              <HistologySessionDetails
                key={session.id}
                session={session}
                readOnly={readOnly}
                {...(readOnly
                  ? {}
                  : {
                      onEdit: () => setMode({ kind: "edit", session }),
                      onDelete: async () => {
                        await deletion.deleteHistologySession(session.id);
                        await reload();
                      },
                    })}
              />
            ))}
            {readOnly ? null : <div>{addButton}</div>}
          </div>
        )
      ) : null}
    </div>
  );
}
