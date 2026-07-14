import { useEffect, useState } from "react";
import { AlertTriangle, PawPrint, Plus } from "lucide-react";

import type { Animal } from "@/domain/entities/animal";
import { CollapsibleSection } from "@/presentation/components/collapsible-section";
import { EmptyState } from "@/presentation/components/empty-state";
import { LoadingState } from "@/presentation/components/loading-state";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { AnimalForm, type AnimalFormValues } from "./components/animal-form";
import { AnimalListItem } from "./components/animal-list-item";
import { useAnimals } from "./use-animals";
import { useAnimalsService } from "./animals-service-context";

type SectionMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; animal: Animal };

/**
 * The Animals registry for an opened study. Contextual (not a sidebar item): it
 * lists the study's animals and provides add/edit workflows. Handles loading,
 * empty, error, and populated states honestly; never invents data.
 *
 * When `readOnly` (the parent study is archived), animals stay viewable but add
 * and edit affordances are hidden — the application layer also refuses such
 * writes, so this is defense in depth, not the only guard.
 */
export function AnimalsSection({
  studyId,
  readOnly = false,
  onCountChange,
}: {
  studyId: string;
  readOnly?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const service = useAnimalsService();
  const { state, reload } = useAnimals(studyId);
  const [mode, setMode] = useState<SectionMode>({ kind: "list" });

  // Archived studies are read-only: never show the add/edit forms.
  const effectiveMode: SectionMode = readOnly ? { kind: "list" } : mode;
  const animalCount = state.status === "ready" ? state.animals.length : undefined;

  useEffect(() => {
    if (animalCount !== undefined) onCountChange?.(animalCount);
  }, [animalCount, onCountChange]);

  async function handleCreate(values: AnimalFormValues) {
    await service.create({
      studyId,
      animalIdentifier: values.animalIdentifier,
      sex: values.sex,
      dateOfBirth: values.dateOfBirth,
      mutation: values.mutation,
      treatmentGroup: values.treatmentGroup,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: AnimalFormValues) {
    await service.update({
      id,
      animalIdentifier: values.animalIdentifier,
      sex: values.sex,
      dateOfBirth: values.dateOfBirth,
      mutation: values.mutation,
      treatmentGroup: values.treatmentGroup,
    });
    setMode({ kind: "list" });
    await reload();
  }

  const addButton = (
    <Button onClick={() => setMode({ kind: "create" })}>
      <Plus />
      Add animal
    </Button>
  );

  return (
    <CollapsibleSection
      title="Animals"
      description="The mice tracked in this study."
      {...(animalCount !== undefined ? { count: animalCount } : {})}
      storageKey={`als.section.${studyId}.animals`}
    >
      <div className="space-y-4">
      {readOnly && state.status === "ready" ? (
        <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This study is archived, so its animal registry is read-only. Restore the
          study to add or edit animals.
        </p>
      ) : null}

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Animals are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <LoadingState label="Loading animals…" />
      ) : null}

      {state.status === "error" ? (
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't load the animals"
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
            <AnimalForm
              submitLabel="Add animal"
              onSubmit={handleCreate}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "edit" ? (
        <Card>
          <CardContent className="pt-6">
            <AnimalForm
              initialValues={{
                animalIdentifier: effectiveMode.animal.animalIdentifier,
                sex: effectiveMode.animal.sex,
                ...(effectiveMode.animal.dateOfBirth !== undefined
                  ? { dateOfBirth: effectiveMode.animal.dateOfBirth }
                  : {}),
                ...(effectiveMode.animal.mutation !== undefined
                  ? { mutation: effectiveMode.animal.mutation }
                  : {}),
                ...(effectiveMode.animal.treatmentGroup !== undefined
                  ? { treatmentGroup: effectiveMode.animal.treatmentGroup }
                  : {}),
              }}
              submitLabel="Save changes"
              onSubmit={(values) =>
                handleUpdate(effectiveMode.animal.id, values)
              }
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "list" ? (
        state.animals.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="No animals yet"
            description={
              readOnly
                ? "This archived study has no animals."
                : "Add the mice you're following in this study to start building its registry."
            }
            {...(readOnly ? {} : { action: addButton })}
          />
        ) : (
          <div className="space-y-3">
            {!readOnly ? (
              <div className="flex justify-end">{addButton}</div>
            ) : null}
            <ul className="space-y-2.5">
              {state.animals.map((animal) => (
                <li key={animal.id}>
                  <AnimalListItem
                    animal={animal}
                    to={`/studies/${studyId}/animals/${animal.id}`}
                    {...(readOnly
                      ? {}
                      : { onEdit: () => setMode({ kind: "edit", animal }) })}
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
