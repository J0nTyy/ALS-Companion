import { useState } from "react";
import { FlaskConical, Plus } from "lucide-react";

import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import {
  BiomarkerSampleForm,
  type BiomarkerSampleFormValues,
} from "./components/biomarker-sample-form";
import { BiomarkerSampleCard } from "./components/biomarker-sample-card";
import { useBiomarkerSamples } from "./use-biomarker-samples";
import { useBiomarkerService } from "./biomarker-service-context";

type PanelMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; sample: BiomarkerSample };

/**
 * The Biomarker panel shown beneath a timeline event of category "Biochemical
 * Analysis". Records biological samples and their laboratory results (manual entry
 * only). This milestone CAPTURES measurements — it does not analyze them. Archived
 * studies are read-only.
 */
export function BiomarkerPanel({
  timelineEventId,
  readOnly = false,
}: {
  timelineEventId: string;
  readOnly?: boolean;
}) {
  const service = useBiomarkerService();
  const { state, reload } = useBiomarkerSamples(timelineEventId);
  const [mode, setMode] = useState<PanelMode>({ kind: "list" });

  const effectiveMode: PanelMode = readOnly ? { kind: "list" } : mode;

  async function handleCreate(values: BiomarkerSampleFormValues) {
    await service.createSample({
      timelineEventId,
      sampleType: values.sampleType,
      collectionDate: values.collectionDate,
      operator: values.operator,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: BiomarkerSampleFormValues) {
    await service.updateSample({
      id,
      sampleType: values.sampleType,
      collectionDate: values.collectionDate,
      operator: values.operator,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  const addButton = (
    <Button size="sm" onClick={() => setMode({ kind: "create" })}>
      <Plus />
      Add biomarker sample
    </Button>
  );

  return (
    <div className="ml-3 space-y-3 border-l-2 border-primary/20 pl-4">
      <div className="flex items-center gap-2 pt-1 text-sm font-medium text-foreground">
        <FlaskConical className="h-4 w-4 text-primary" />
        Biomarker samples
      </div>

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Biomarker samples are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">
          Loading biomarker samples…
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
            <BiomarkerSampleForm
              submitLabel="Save sample"
              onSubmit={handleCreate}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "edit" ? (
        <Card>
          <CardContent className="pt-6">
            <BiomarkerSampleForm
              initialValues={{
                sampleType: effectiveMode.sample.sampleType,
                collectionDate: effectiveMode.sample.collectionDate,
                ...(effectiveMode.sample.operator !== undefined
                  ? { operator: effectiveMode.sample.operator }
                  : {}),
                ...(effectiveMode.sample.notes !== undefined
                  ? { notes: effectiveMode.sample.notes }
                  : {}),
              }}
              submitLabel="Save changes"
              onSubmit={(values) => handleUpdate(effectiveMode.sample.id, values)}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "list" ? (
        state.samples.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              No biomarker sample recorded for this event yet.
            </p>
            {readOnly ? null : addButton}
          </div>
        ) : (
          <div className="space-y-3">
            {state.samples.map((sample) => (
              <BiomarkerSampleCard
                key={sample.id}
                sample={sample}
                readOnly={readOnly}
                {...(readOnly
                  ? {}
                  : {
                      onEdit: () => setMode({ kind: "edit", sample }),
                      onDelete: async () => {
                        await service.deleteSample(sample.id);
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
