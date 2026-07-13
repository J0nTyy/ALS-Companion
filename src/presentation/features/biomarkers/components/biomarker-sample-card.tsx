import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";

import {
  BIOMARKER_SAMPLE_TYPE_META,
  type BiomarkerSample,
} from "@/domain/entities/biomarker-sample";
import type { BiomarkerResult } from "@/domain/entities/biomarker-result";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import {
  ConfirmDeleteButton,
  type ConfirmDeleteHandle,
} from "@/presentation/components/confirm-delete-button";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import {
  buildBiomarkerResultContextMenu,
  buildBiomarkerSampleContextMenu,
} from "@/presentation/features/context-menu/menus";
import { formatDateOnly } from "@/shared/lib/format";
import { useBiomarkerService } from "../biomarker-service-context";
import { useBiomarkerResults } from "../use-biomarker-results";
import {
  BiomarkerResultForm,
  type BiomarkerResultFormValues,
} from "./biomarker-result-form";

type ResultMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; result: BiomarkerResult };

/**
 * One biomarker sample: its metadata plus an expandable table of laboratory
 * results. Each sample expands to show its values; results are added/edited/removed
 * inline (manual entry only). Read-only on an archived study.
 */
export function BiomarkerSampleCard({
  sample,
  readOnly = false,
  onEdit,
  onDelete,
}: {
  sample: BiomarkerSample;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const service = useBiomarkerService();
  const contextMenu = useContextMenu();
  const deleteRef = useRef<ConfirmDeleteHandle>(null);
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<ResultMode>({ kind: "list" });
  const { state, reload } = useBiomarkerResults(sample.id);

  const label = BIOMARKER_SAMPLE_TYPE_META[sample.sampleType].label;
  const effectiveMode: ResultMode = readOnly ? { kind: "list" } : mode;

  async function handleCreate(values: BiomarkerResultFormValues) {
    await service.createResult({
      biomarkerSampleId: sample.id,
      biomarkerName: values.biomarkerName,
      value: values.value,
      unit: values.unit,
      method: values.method,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: BiomarkerResultFormValues) {
    await service.updateResult({
      id,
      biomarkerName: values.biomarkerName,
      value: values.value,
      unit: values.unit,
      method: values.method,
      notes: values.notes,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleDeleteResult(id: string) {
    await service.deleteResult(id);
    await reload();
  }

  const resultCount =
    state.status === "ready" ? state.results.length : undefined;

  return (
    <div
      className="rounded-lg border border-border bg-card px-5 py-4"
      onContextMenu={(e) =>
        contextMenu.open(
          e,
          buildBiomarkerSampleContextMenu({
            ...(readOnly ? {} : { onAddResult: () => setMode({ kind: "create" }) }),
            ...(onEdit ? { onEdit } : {}),
            ...(onDelete ? { onDelete: () => deleteRef.current?.open() } : {}),
          }),
        )
      }
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-sm text-muted-foreground">
            {formatDateOnly(sample.collectionDate)}
            {resultCount !== undefined
              ? ` · ${resultCount} result${resultCount === 1 ? "" : "s"}`
              : ""}
          </span>
        </button>
        {onEdit || onDelete ? (
          <div className="flex items-center gap-1">
            {onEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                aria-label={`Edit ${label} sample`}
              >
                <Pencil />
                Edit
              </Button>
            ) : null}
            {onDelete ? (
              <ConfirmDeleteButton
                ref={deleteRef}
                iconOnly
                triggerAriaLabel={`Delete ${label} sample`}
                title="Delete this biomarker sample?"
                description={
                  <>
                    This permanently removes the{" "}
                    <span className="font-medium text-foreground">{label}</span>{" "}
                    sample and all of its laboratory results. This action cannot be
                    undone.
                  </>
                }
                onConfirm={onDelete}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {sample.operator || sample.notes ? (
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 pl-6 text-sm sm:grid-cols-2">
          {sample.operator ? (
            <div>
              <dt className="inline text-muted-foreground">Operator: </dt>
              <dd className="inline text-foreground">{sample.operator}</dd>
            </div>
          ) : null}
          {sample.notes ? (
            <div className="sm:col-span-2">
              <dt className="inline text-muted-foreground">Notes: </dt>
              <dd className="inline text-foreground">{sample.notes}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {expanded ? (
        <div className="mt-3 pl-6">
          {state.status === "unavailable" ? (
            <p className="text-sm text-muted-foreground">
              Laboratory results are available in the installed desktop app.
            </p>
          ) : null}
          {state.status === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading results…</p>
          ) : null}
          {state.status === "error" ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}

          {state.status === "ready" ? (
            <>
              {state.results.length === 0 && effectiveMode.kind !== "create" ? (
                <p className="text-sm text-muted-foreground">
                  No laboratory results recorded for this sample yet.
                </p>
              ) : null}

              {state.results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-1.5 pr-3 font-medium">Biomarker</th>
                        <th className="py-1.5 pr-3 font-medium">Value</th>
                        <th className="py-1.5 pr-3 font-medium">Unit</th>
                        <th className="py-1.5 pr-3 font-medium">Method</th>
                        {readOnly ? null : (
                          <th className="py-1.5 font-medium text-right">
                            <span className="sr-only">Actions</span>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {state.results.map((result) => (
                        <ResultRow
                          key={result.id}
                          result={result}
                          readOnly={readOnly}
                          onEdit={() => setMode({ kind: "edit", result })}
                          onDelete={() => handleDeleteResult(result.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {effectiveMode.kind === "create" ? (
                <Card className="mt-3">
                  <CardContent className="pt-6">
                    <BiomarkerResultForm
                      submitLabel="Add result"
                      onSubmit={handleCreate}
                      onCancel={() => setMode({ kind: "list" })}
                    />
                  </CardContent>
                </Card>
              ) : null}

              {effectiveMode.kind === "edit" ? (
                <Card className="mt-3">
                  <CardContent className="pt-6">
                    <BiomarkerResultForm
                      initialValues={{
                        biomarkerName: effectiveMode.result.biomarkerName,
                        value: effectiveMode.result.value,
                        ...(effectiveMode.result.unit !== undefined
                          ? { unit: effectiveMode.result.unit }
                          : {}),
                        ...(effectiveMode.result.method !== undefined
                          ? { method: effectiveMode.result.method }
                          : {}),
                        ...(effectiveMode.result.notes !== undefined
                          ? { notes: effectiveMode.result.notes }
                          : {}),
                      }}
                      submitLabel="Save changes"
                      onSubmit={(values) =>
                        handleUpdate(effectiveMode.result.id, values)
                      }
                      onCancel={() => setMode({ kind: "list" })}
                    />
                  </CardContent>
                </Card>
              ) : null}

              {!readOnly && effectiveMode.kind === "list" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setMode({ kind: "create" })}
                >
                  <Plus />
                  Add result
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultRow({
  result,
  readOnly,
  onEdit,
  onDelete,
}: {
  result: BiomarkerResult;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const contextMenu = useContextMenu();
  const deleteRef = useRef<ConfirmDeleteHandle>(null);
  return (
    <tr
      className="border-b border-border/60 last:border-0"
      onContextMenu={(e) =>
        contextMenu.open(
          e,
          buildBiomarkerResultContextMenu(
            readOnly
              ? {}
              : { onEdit, onDelete: () => deleteRef.current?.open() },
          ),
        )
      }
    >
      <td className="py-1.5 pr-3 text-foreground">{result.biomarkerName}</td>
      <td className="py-1.5 pr-3 text-foreground">{result.value}</td>
      <td className="py-1.5 pr-3 text-muted-foreground">{result.unit ?? "—"}</td>
      <td className="py-1.5 pr-3 text-muted-foreground">
        {result.method ?? "—"}
      </td>
      {readOnly ? null : (
        <td className="py-1.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label={`Edit ${result.biomarkerName} result`}
            >
              <Pencil />
            </Button>
            <ConfirmDeleteButton
              ref={deleteRef}
              iconOnly
              triggerAriaLabel={`Delete ${result.biomarkerName} result`}
              title="Delete this result?"
              description={
                <>
                  This permanently removes the{" "}
                  <span className="font-medium text-foreground">
                    {result.biomarkerName}
                  </span>{" "}
                  result. This action cannot be undone.
                </>
              }
              onConfirm={onDelete}
            />
          </div>
        </td>
      )}
    </tr>
  );
}
