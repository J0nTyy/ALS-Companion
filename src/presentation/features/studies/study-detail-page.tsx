import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Archive, Pencil } from "lucide-react";

import type { Study } from "@/domain/entities/study";
import { isTauri } from "@/infrastructure/platform/environment";
import { PageHeader } from "@/presentation/components/page-header";
import { DetailLayout } from "@/presentation/components/detail-layout";
import { HELP } from "@/presentation/features/help/help-sections";
import { EmptyState } from "@/presentation/components/empty-state";
import { LoadingState } from "@/presentation/components/loading-state";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { formatDate } from "@/shared/lib/format";
import { AnimalsSection } from "@/presentation/features/animals/animals-section";
import { ProtocolSection } from "@/presentation/features/protocols/protocol-section";
import {
  ConfirmDeleteButton,
  type ConfirmDeleteHandle,
} from "@/presentation/components/confirm-delete-button";
import { useDeletionService } from "@/presentation/features/deletion/deletion-service-context";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildStudyContextMenu } from "@/presentation/features/context-menu/menus";
import { DesktopOnlyNotice } from "./components/desktop-only-notice";
import { StudyForm, type StudyFormValues } from "./components/study-form";
import { StudyStatusBadge } from "./components/study-status-badge";
import { useStudiesService } from "./studies-service-context";
import { toUserMessage } from "./error-message";

type DetailState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ready"; study: Study };

/** Open, edit, and archive a single study. */
export function StudyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const service = useStudiesService();

  const [state, setState] = useState<DetailState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );
  const [mode, setMode] = useState<"view" | "edit">("view");

  const load = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    if (!id) {
      setState({ status: "notfound" });
      return;
    }
    setState({ status: "loading" });
    try {
      const study = await service.get(id);
      setState(study ? { status: "ready", study } : { status: "notfound" });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open this study. Please try again.",
        ),
      });
    }
  }, [service, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleEditSubmit(values: StudyFormValues) {
    if (!id) return;
    const updated = await service.update({
      id,
      name: values.name,
      strain: values.strain,
      status: values.status,
      description: values.description,
    });
    setState({ status: "ready", study: updated });
    setMode("view");
  }

  const backButton = (
    <Button variant="outline" onClick={() => navigate("/studies")}>
      <ArrowLeft />
      Back to studies
    </Button>
  );

  if (state.status === "unavailable") {
    return (
      <div className="space-y-8">
        <PageHeader title="Study" actions={backButton} />
        <DesktopOnlyNotice />
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="space-y-8">
        <PageHeader title="Study" actions={backButton} />
        <LoadingState label="Opening study…" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="space-y-8">
        <PageHeader title="Study" actions={backButton} />
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't open this study"
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
        <PageHeader title="Study not found" actions={backButton} />
        <EmptyState
          icon={AlertTriangle}
          title="This study doesn't exist"
          description="It may have been removed, or the link is out of date."
          action={
            <Button onClick={() => navigate("/studies")}>
              Go to studies
            </Button>
          }
        />
      </div>
    );
  }

  const { study } = state;

  return (
    <div className="space-y-8">
      <PageHeader
        title={study.name}
        help={HELP.studies}
        description={study.strain}
        actions={backButton}
      />

      {mode === "edit" ? (
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <StudyForm
              initialValues={{
                name: study.name,
                strain: study.strain,
                status: study.status,
                ...(study.description !== undefined
                  ? { description: study.description }
                  : {}),
              }}
              submitLabel="Save changes"
              onSubmit={handleEditSubmit}
              onCancel={() => setMode("view")}
            />
          </CardContent>
        </Card>
      ) : (
        <StudyDetailView
          study={study}
          onEdit={() => setMode("edit")}
          onArchived={() => navigate("/studies")}
          onDeleted={() => navigate("/studies")}
        />
      )}
    </div>
  );
}

function StudyDetailView({
  study,
  onEdit,
  onArchived,
  onDeleted,
}: {
  study: Study;
  onEdit: () => void;
  onArchived: () => void;
  onDeleted: () => void;
}) {
  const service = useStudiesService();
  const deletion = useDeletionService();
  const contextMenu = useContextMenu();
  const deleteRef = useRef<ConfirmDeleteHandle>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [animalCount, setAnimalCount] = useState<number | undefined>(undefined);
  const [stepCount, setStepCount] = useState<number | undefined>(undefined);

  const confirmHeadingId = useId();
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null);
  const archiveTriggerRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  const isArchived = study.status === "archived";

  // Move focus into the confirmation when it opens (announces the prompt), and
  // return it to the Archive trigger when it closes without archiving.
  useEffect(() => {
    if (confirmingArchive && !wasConfirming.current) {
      confirmHeadingRef.current?.focus();
    } else if (!confirmingArchive && wasConfirming.current) {
      archiveTriggerRef.current?.focus();
    }
    wasConfirming.current = confirmingArchive;
  }, [confirmingArchive]);

  function cancelArchive() {
    setArchiveError(null);
    setConfirmingArchive(false);
  }

  async function handleArchive() {
    setArchiving(true);
    setArchiveError(null);
    try {
      await service.archive(study.id);
      onArchived();
    } catch (error) {
      setArchiveError(
        toUserMessage(error, "We couldn't archive this study. Please try again."),
      );
      setArchiving(false);
    }
  }

  const jumpLink = (href: string, label: string) => (
    <a
      href={href}
      className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </a>
  );

  const aside = (
    <>
      <Card
        onContextMenu={(e) =>
          contextMenu.open(
            e,
            buildStudyContextMenu({
              onEdit,
              isArchived,
              ...(isArchived ? {} : { onArchive: () => setConfirmingArchive(true) }),
              onDelete: () => deleteRef.current?.open(),
            }),
          )
        }
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Overview</CardTitle>
            <StudyStatusBadge status={study.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow label="Strain or line" value={study.strain} />
          <div className="grid grid-cols-2 gap-4">
            <DetailRow
              label="Animals"
              value={animalCount === undefined ? "—" : String(animalCount)}
            />
            <DetailRow
              label="Protocol steps"
              value={stepCount === undefined ? "—" : String(stepCount)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <DetailRow label="Created" value={formatDate(study.createdAt)} />
            <DetailRow label="Updated" value={formatDate(study.updatedAt)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button onClick={onEdit} className="w-full justify-start">
          <Pencil />
          Edit study
        </Button>
        {!isArchived ? (
          <Button
            ref={archiveTriggerRef}
            variant="outline"
            onClick={() => setConfirmingArchive(true)}
            disabled={confirmingArchive}
            className="w-full justify-start"
          >
            <Archive />
            Archive
          </Button>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">
            This study is archived. Edit it to change its status.
          </p>
        )}
      </div>

      {confirmingArchive ? (
        <div
          role="group"
          aria-labelledby={confirmHeadingId}
          className="space-y-3 rounded-lg border border-border bg-muted/40 p-4"
        >
          <h3
            id={confirmHeadingId}
            ref={confirmHeadingRef}
            tabIndex={-1}
            className="text-sm font-semibold text-foreground focus:outline-none"
          >
            Archive this study?
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{study.name}</span> will
            be hidden from your active list but never deleted — you can view it
            again anytime with “Show archived”.
          </p>
          {archiveError ? (
            <p role="alert" className="text-sm text-destructive">
              {archiveError}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              onClick={() => void handleArchive()}
              disabled={archiving}
            >
              {archiving ? "Archiving…" : "Archive study"}
            </Button>
            <Button variant="ghost" onClick={cancelArchive} disabled={archiving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-2">
        <p className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Jump to
        </p>
        {jumpLink("#protocol", "Protocol")}
        {jumpLink("#animals", "Animals")}
        {jumpLink("#danger", "Danger zone")}
      </div>
    </>
  );

  return (
    <DetailLayout aside={aside}>
      {study.description ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {study.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div id="protocol" className="scroll-mt-4">
        <ProtocolSection
          studyId={study.id}
          readOnly={isArchived}
          onCountChange={setStepCount}
        />
      </div>

      <div id="animals" className="scroll-mt-4">
        <AnimalsSection
          studyId={study.id}
          readOnly={isArchived}
          onCountChange={setAnimalCount}
        />
      </div>

      <Card id="danger" className="scroll-mt-4 border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete this study and everything inside it — every animal,
            observation, timeline event, MRI session, and attached file. This
            cannot be undone. To archive instead, use the button in the sidebar.
          </p>
          <ConfirmDeleteButton
            ref={deleteRef}
            triggerLabel="Delete study"
            title="Delete this study permanently?"
            confirmPhrase={study.name}
            description={
              <>
                This permanently removes{" "}
                <span className="font-medium text-foreground">{study.name}</span>{" "}
                and all of its animals, observations, timeline events, MRI
                sessions, protocol, and attached image files. This action cannot
                be undone.
              </>
            }
            onConfirm={async () => {
              await deletion.deleteStudy(study.id);
              onDeleted();
            }}
          />
        </CardContent>
      </Card>
    </DetailLayout>
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
