import { useEffect, useId, useState, type FormEvent } from "react";
import { AlertTriangle, ClipboardList, Pencil, Plus } from "lucide-react";

import { CollapsibleSection } from "@/presentation/components/collapsible-section";

import type {
  ProtocolStep,
  ProtocolWithSteps,
} from "@/domain/entities/protocol-template";
import { EmptyState } from "@/presentation/components/empty-state";
import { LoadingState } from "@/presentation/components/loading-state";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { toUserMessage } from "@/presentation/lib/error-message";
import {
  ProtocolStepForm,
  type ProtocolStepFormValues,
} from "./components/protocol-step-form";
import { ProtocolStepItem } from "./components/protocol-step-item";
import { useProtocol } from "./use-protocol";
import { useProtocolService } from "./protocol-service-context";

const DEFAULT_PROTOCOL_NAME = "Study protocol";

type Mode =
  | { kind: "list" }
  | { kind: "createStep" }
  | { kind: "editStep"; step: ProtocolStep }
  | { kind: "rename" };

/** Reorder an id list by moving `from` to `to`. */
function moveId(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}

/**
 * The reusable protocol for a study, shown in Study Detail (above Animals). New
 * animals in the study inherit these steps as their experiment timeline. Editing
 * the protocol only affects animals added afterward. Archived studies are
 * read-only.
 */
export function ProtocolSection({
  studyId,
  readOnly = false,
  onCountChange,
}: {
  studyId: string;
  readOnly?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const service = useProtocolService();
  const { state, reload } = useProtocol(studyId);
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  const effectiveMode: Mode = readOnly ? { kind: "list" } : mode;
  const protocol = state.status === "ready" ? state.protocol : null;
  const stepCount = protocol?.steps.length;

  useEffect(() => {
    if (state.status === "ready") onCountChange?.(protocol?.steps.length ?? 0);
  }, [state.status, protocol?.steps.length, onCountChange]);

  async function handleCreateProtocol() {
    await service.createProtocol({ studyId, name: DEFAULT_PROTOCOL_NAME });
    await reload();
  }

  async function handleRename(protocol: ProtocolWithSteps, name: string) {
    await service.updateProtocol({ id: protocol.template.id, name });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleAddStep(
    protocol: ProtocolWithSteps,
    values: ProtocolStepFormValues,
  ) {
    await service.addStep({
      protocolTemplateId: protocol.template.id,
      title: values.title,
      category: values.category,
      offsetDays: values.offsetDays,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdateStep(id: string, values: ProtocolStepFormValues) {
    await service.updateStep({
      id,
      title: values.title,
      category: values.category,
      offsetDays: values.offsetDays,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleRemoveStep(id: string) {
    await service.removeStep(id);
    await reload();
  }

  async function handleReorder(
    protocol: ProtocolWithSteps,
    from: number,
    to: number,
  ) {
    const orderedStepIds = moveId(
      protocol.steps.map((step) => step.id),
      from,
      to,
    );
    await service.reorderSteps({
      templateId: protocol.template.id,
      orderedStepIds,
    });
    await reload();
  }

  const addStepButton = (
    <Button onClick={() => setMode({ kind: "createStep" })}>
      <Plus />
      Add step
    </Button>
  );

  return (
    <CollapsibleSection
      title="Protocol"
      description="Define the experiment workflow once. New animals in this study start with these steps as their timeline; editing the protocol only affects animals added afterward."
      {...(stepCount !== undefined ? { count: stepCount } : {})}
      storageKey={`als.section.${studyId}.protocol`}
    >
      <div className="space-y-4">
      {readOnly && state.status === "ready" ? (
        <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This study is archived, so its protocol is read-only. Restore the study
          to change it.
        </p>
      ) : null}

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Protocols are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <LoadingState label="Loading protocol…" />
      ) : null}

      {state.status === "error" ? (
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't load the protocol"
          description={state.message}
          action={
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          }
        />
      ) : null}

      {state.status === "ready" && state.protocol === null ? (
        <EmptyState
          icon={ClipboardList}
          title="No protocol yet"
          description={
            readOnly
              ? "This archived study has no protocol."
              : "Create a protocol to define reusable workflow steps that new animals inherit automatically."
          }
          {...(readOnly
            ? {}
            : {
                action: (
                  <Button onClick={() => void handleCreateProtocol()}>
                    <Plus />
                    Create protocol
                  </Button>
                ),
              })}
        />
      ) : null}

      {state.status === "ready" && state.protocol !== null
        ? renderProtocol(state.protocol)
        : null}
      </div>
    </CollapsibleSection>
  );

  function renderProtocol(protocol: ProtocolWithSteps) {
    if (effectiveMode.kind === "rename") {
      return (
        <Card>
          <CardContent className="pt-6">
            <RenameForm
              initialName={protocol.template.name}
              onSubmit={(name) => handleRename(protocol, name)}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      );
    }

    if (effectiveMode.kind === "createStep") {
      return (
        <Card>
          <CardContent className="pt-6">
            <ProtocolStepForm
              submitLabel="Add step"
              onSubmit={(values) => handleAddStep(protocol, values)}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      );
    }

    if (effectiveMode.kind === "editStep") {
      const step = effectiveMode.step;
      return (
        <Card>
          <CardContent className="pt-6">
            <ProtocolStepForm
              initialValues={{
                title: step.title,
                category: step.category,
                offsetDays: step.offsetDays,
                ...(step.notes !== undefined ? { notes: step.notes } : {}),
              }}
              submitLabel="Save changes"
              onSubmit={(values) => handleUpdateStep(step.id, values)}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {protocol.template.name}
            </span>
            {!readOnly ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode({ kind: "rename" })}
              >
                <Pencil />
                Rename
              </Button>
            ) : null}
          </div>
          {!readOnly && protocol.steps.length > 0 ? addStepButton : null}
        </div>

        {protocol.steps.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No steps yet"
            description={
              readOnly
                ? "This protocol has no steps."
                : "Add workflow steps (with a day offset from when an animal is added) to build the protocol."
            }
            {...(readOnly ? {} : { action: addStepButton })}
          />
        ) : (
          <ol className="space-y-2">
            {protocol.steps.map((step, index) => (
              <li key={step.id}>
                <ProtocolStepItem
                  step={step}
                  position={index + 1}
                  isFirst={index === 0}
                  isLast={index === protocol.steps.length - 1}
                  {...(readOnly
                    ? {}
                    : {
                        onEdit: () => setMode({ kind: "editStep", step }),
                        onRemove: () => void handleRemoveStep(step.id),
                        onMoveUp: () =>
                          void handleReorder(protocol, index, index - 1),
                        onMoveDown: () =>
                          void handleReorder(protocol, index, index + 1),
                      })}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
}

function RenameForm({
  initialName,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const nameId = useId();
  const errorId = useId();
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await onSubmit(name);
    } catch (error) {
      setMessage(
        toUserMessage(error, "Something went wrong. Please try again."),
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor={nameId}>
          Protocol name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          autoFocus
          aria-describedby={message ? errorId : undefined}
          disabled={submitting}
        />
        {message ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {message}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
