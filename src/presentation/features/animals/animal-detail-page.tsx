import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { ANIMAL_SEX_META, type Animal } from "@/domain/entities/animal";
import type { Study } from "@/domain/entities/study";
import { isTauri } from "@/infrastructure/platform/environment";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { LoadingState } from "@/presentation/components/loading-state";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { formatDateOnly } from "@/shared/lib/format";
import { toUserMessage } from "@/presentation/lib/error-message";
import { DesktopOnlyNotice } from "@/presentation/features/studies/components/desktop-only-notice";
import { useStudiesService } from "@/presentation/features/studies/studies-service-context";
import { useAnimalsService } from "@/presentation/features/animals/animals-service-context";
import { ObservationsSection } from "@/presentation/features/observations/observations-section";
import { TimelineSection } from "@/presentation/features/timeline/timeline-section";
import {
  ConfirmDeleteButton,
  type ConfirmDeleteHandle,
} from "@/presentation/components/confirm-delete-button";
import { useDeletionService } from "@/presentation/features/deletion/deletion-service-context";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildAnimalContextMenu } from "@/presentation/features/context-menu/menus";

type DetailState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ready"; study: Study; animal: Animal };

/**
 * Animal Details: the animal's metadata plus its observations timeline. This is
 * the contextual home for recording and editing observations. Metadata editing
 * stays in the study's animal registry (unchanged).
 */
export function AnimalDetailPage() {
  const { studyId, animalId } = useParams<{
    studyId: string;
    animalId: string;
  }>();
  const navigate = useNavigate();
  const studiesService = useStudiesService();
  const animalsService = useAnimalsService();
  const deletion = useDeletionService();
  const contextMenu = useContextMenu();
  const deleteRef = useRef<ConfirmDeleteHandle>(null);

  const [state, setState] = useState<DetailState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const load = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    if (!studyId || !animalId) {
      setState({ status: "notfound" });
      return;
    }
    setState({ status: "loading" });
    try {
      const [study, animal] = await Promise.all([
        studiesService.get(studyId),
        animalsService.get(animalId),
      ]);
      if (!study || !animal || animal.studyId !== studyId) {
        setState({ status: "notfound" });
        return;
      }
      setState({ status: "ready", study, animal });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open this animal. Please try again.",
        ),
      });
    }
  }, [studiesService, animalsService, studyId, animalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const backButton = (
    <Button
      variant="outline"
      onClick={() => navigate(studyId ? `/studies/${studyId}` : "/studies")}
    >
      <ArrowLeft />
      Back to study
    </Button>
  );

  if (state.status === "unavailable") {
    return (
      <div className="space-y-8">
        <PageHeader title="Animal" actions={backButton} />
        <DesktopOnlyNotice />
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-8">
        <PageHeader title="Animal" actions={backButton} />
        <LoadingState label="Opening animal…" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-8">
        <PageHeader title="Animal" actions={backButton} />
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't open this animal"
          description={state.message}
          action={
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (state.status === "notfound") {
    return (
      <div className="space-y-8">
        <PageHeader title="Animal not found" actions={backButton} />
        <EmptyState
          icon={AlertTriangle}
          title="This animal doesn't exist here"
          description="It may have been moved, or the link is out of date."
          action={
            <Button onClick={() => navigate("/studies")}>Go to studies</Button>
          }
        />
      </div>
    );
  }

  const { study, animal } = state;
  const readOnly = study.status === "archived";

  return (
    <div className="space-y-8">
      <PageHeader
        title={animal.animalIdentifier}
        description={study.name}
        actions={backButton}
      />

      <div className="max-w-2xl space-y-6">
        <Card
          onContextMenu={(e) =>
            contextMenu.open(
              e,
              buildAnimalContextMenu({
                onDelete: () => deleteRef.current?.open(),
              }),
            )
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Animal details</CardTitle>
              <ConfirmDeleteButton
                ref={deleteRef}
                triggerLabel="Delete animal"
                title="Delete this animal permanently?"
                description={
                  <>
                    This permanently removes{" "}
                    <span className="font-medium text-foreground">
                      {animal.animalIdentifier}
                    </span>{" "}
                    and all of its observations, timeline events, MRI sessions,
                    and attached image files. This action cannot be undone.
                  </>
                }
                onConfirm={async () => {
                  await deletion.deleteAnimal(animal.id);
                  navigate(`/studies/${study.id}`);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow label="Sex" value={ANIMAL_SEX_META[animal.sex].label} />
            <DetailRow
              label="Date of birth"
              value={
                animal.dateOfBirth
                  ? formatDateOnly(animal.dateOfBirth)
                  : "Not recorded"
              }
              muted={animal.dateOfBirth === undefined}
            />
            <DetailRow
              label="Mutation or genotype"
              value={animal.mutation ?? "Not recorded"}
              muted={animal.mutation === undefined}
            />
            <DetailRow
              label="Treatment group"
              value={animal.treatmentGroup ?? "Not recorded"}
              muted={animal.treatmentGroup === undefined}
            />
          </CardContent>
        </Card>

        <ObservationsSection
          animalId={animal.id}
          studyId={study.id}
          readOnly={readOnly}
        />

        <TimelineSection
          animalId={animal.id}
          studyId={study.id}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          muted
            ? "text-sm italic text-muted-foreground"
            : "text-sm text-foreground"
        }
      >
        {value || "—"}
      </p>
    </div>
  );
}
