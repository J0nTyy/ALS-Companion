import { useEffect, useState } from "react";
import { AlertTriangle, LineChart, Plus } from "lucide-react";

import type { Observation } from "@/domain/entities/observation";
import { CollapsibleSection } from "@/presentation/components/collapsible-section";
import { EmptyState } from "@/presentation/components/empty-state";
import { LoadingState } from "@/presentation/components/loading-state";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import {
  ObservationForm,
  type ObservationFormValues,
} from "./components/observation-form";
import { ObservationListItem } from "./components/observation-list-item";
import { useObservations } from "./use-observations";
import { useObservationsService } from "./observations-service-context";
import { useDeletionService } from "@/presentation/features/deletion/deletion-service-context";

type SectionMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; observation: Observation };

/**
 * The observations timeline for one animal (contextual — no sidebar item). Lists
 * measurements most-recent-first and provides record/edit workflows. Honest
 * loading/empty/error/populated states; never invents data.
 *
 * When `readOnly` (the parent study is archived), observations stay viewable but
 * record/edit affordances are hidden — the application layer also refuses such
 * writes, so this is defense in depth.
 */
export function ObservationsSection({
  animalId,
  studyId,
  readOnly = false,
  onCountChange,
}: {
  animalId: string;
  studyId: string;
  readOnly?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const service = useObservationsService();
  const deletion = useDeletionService();
  const { state, reload } = useObservations(animalId);
  const [mode, setMode] = useState<SectionMode>({ kind: "list" });

  const effectiveMode: SectionMode = readOnly ? { kind: "list" } : mode;
  const observationCount =
    state.status === "ready" ? state.observations.length : undefined;

  useEffect(() => {
    if (observationCount !== undefined) onCountChange?.(observationCount);
  }, [observationCount, onCountChange]);

  async function handleCreate(values: ObservationFormValues) {
    await service.create({
      animalId,
      studyId,
      kind: values.kind,
      observedOn: values.observedOn,
      value: values.value,
      scaleName: values.scaleName,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: ObservationFormValues) {
    await service.update({
      id,
      kind: values.kind,
      observedOn: values.observedOn,
      value: values.value,
      scaleName: values.scaleName,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  const recordButton = (
    <Button onClick={() => setMode({ kind: "create" })}>
      <Plus />
      Record observation
    </Button>
  );

  return (
    <CollapsibleSection
      title="Observations"
      description="Body weights and motor assessments recorded over time."
      {...(observationCount !== undefined ? { count: observationCount } : {})}
      storageKey={`als.section.${animalId}.observations`}
    >
      <div className="space-y-4">
      {readOnly && state.status === "ready" ? (
        <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This study is archived, so observations are read-only. Restore the study
          to record or edit measurements.
        </p>
      ) : null}

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Observations are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <LoadingState label="Loading observations…" />
      ) : null}

      {state.status === "error" ? (
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't load the observations"
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
            <ObservationForm
              submitLabel="Save observation"
              onSubmit={handleCreate}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "edit" ? (
        <Card>
          <CardContent className="pt-6">
            <ObservationForm
              initialValues={{
                kind: effectiveMode.observation.kind,
                observedOn: effectiveMode.observation.observedOn,
                value: effectiveMode.observation.value,
                ...(effectiveMode.observation.scaleName !== undefined
                  ? { scaleName: effectiveMode.observation.scaleName }
                  : {}),
                ...(effectiveMode.observation.notes !== undefined
                  ? { notes: effectiveMode.observation.notes }
                  : {}),
              }}
              submitLabel="Save changes"
              onSubmit={(values) =>
                handleUpdate(effectiveMode.observation.id, values)
              }
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "list" ? (
        state.observations.length === 0 ? (
          <EmptyState
            icon={LineChart}
            title="No observations yet"
            description={
              readOnly
                ? "This archived study's animal has no recorded observations."
                : "Record body weights and motor assessments to build this animal's history."
            }
            {...(readOnly ? {} : { action: recordButton })}
          />
        ) : (
          <div className="space-y-3">
            {!readOnly ? (
              <div className="flex justify-end">{recordButton}</div>
            ) : null}
            <ul className="space-y-2.5">
              {state.observations.map((observation) => (
                <li key={observation.id}>
                  <ObservationListItem
                    observation={observation}
                    {...(readOnly
                      ? {}
                      : {
                          onEdit: () =>
                            setMode({ kind: "edit", observation }),
                          onDelete: async () => {
                            await deletion.deleteObservation(observation.id);
                            await reload();
                          },
                        })}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
      </div>
    </CollapsibleSection>
  );
}
