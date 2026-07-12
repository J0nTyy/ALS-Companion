import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Archive, Pencil } from "lucide-react";

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
import { formatDate } from "@/shared/lib/format";
import { AnimalsSection } from "@/presentation/features/animals/animals-section";
import { ProtocolSection } from "@/presentation/features/protocols/protocol-section";
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
        />
      )}
    </div>
  );
}

function StudyDetailView({
  study,
  onEdit,
  onArchived,
}: {
  study: Study;
  onEdit: () => void;
  onArchived: () => void;
}) {
  const service = useStudiesService();
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

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

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Details</CardTitle>
            <StudyStatusBadge status={study.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <DetailRow label="Strain or line" value={study.strain} />
          <DetailRow
            label="Description"
            value={study.description ?? "No description"}
            muted={study.description === undefined}
          />
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <DetailRow label="Created" value={formatDate(study.createdAt)} />
            <DetailRow label="Last updated" value={formatDate(study.updatedAt)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onEdit}>
            <Pencil />
            Edit study
          </Button>
          {!isArchived ? (
            <Button
              ref={archiveTriggerRef}
              variant="outline"
              onClick={() => setConfirmingArchive(true)}
              disabled={confirmingArchive}
            >
              <Archive />
              Archive
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
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
              <span className="font-medium text-foreground">{study.name}</span>{" "}
              will be hidden from your active list but never deleted — you can
              view it again anytime with “Show archived”.
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
              <Button
                variant="ghost"
                onClick={cancelArchive}
                disabled={archiving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ProtocolSection
        studyId={study.id}
        readOnly={study.status === "archived"}
      />

      <AnimalsSection
        studyId={study.id}
        readOnly={study.status === "archived"}
      />
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
