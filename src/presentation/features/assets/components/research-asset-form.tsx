import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  RESEARCH_ASSET_STATUS_META,
  RESEARCH_ASSET_TYPES,
  RESEARCH_ASSET_TYPE_META,
  SELECTABLE_RESEARCH_ASSET_STATUSES,
  type ResearchAssetType,
} from "@/domain/entities/research-asset";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

/** A status a researcher may set today ("attached" is reserved — set by the future attachment subsystem). */
export type SelectableResearchAssetStatus =
  (typeof SELECTABLE_RESEARCH_ASSET_STATUSES)[number];

export interface ResearchAssetFormValues {
  assetType: ResearchAssetType;
  title: string;
  status: SelectableResearchAssetStatus;
  description: string;
}

interface ResearchAssetFormProps {
  /** Pre-filled values when editing; omitted when creating. */
  initialValues?: Partial<ResearchAssetFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: ResearchAssetFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to create and edit a research asset's metadata (title/type/status/
 * description). Attaching the actual image is a separate step handled by the
 * AssetImagePanel on a saved asset (v1.0) — so this form has no file picker, and
 * "Attached" is not offered as a status here (it is set automatically once a real
 * file is attached).
 */
export function ResearchAssetForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: ResearchAssetFormProps) {
  const typeId = useId();
  const titleId = useId();
  const statusId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const [assetType, setAssetType] = useState<ResearchAssetType>(
    initialValues?.assetType ?? "mri_image",
  );
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [status, setStatus] = useState<SelectableResearchAssetStatus>(
    initialValues?.status ?? "planned",
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [field, setField] = useState<string | undefined>(undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setField(undefined);
    setSubmitting(true);
    try {
      await onSubmit({ assetType, title, status, description });
      // On success the caller closes the form; leave it disabled.
    } catch (error) {
      setField(errorField(error));
      setMessage(
        toUserMessage(
          error,
          "Something went wrong while saving. Please try again.",
        ),
      );
      setSubmitting(false);
    }
  }

  const generalError = message && !field ? message : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor={titleId}>
          Asset title <span className="text-destructive">*</span>
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Baseline T2 axial series"
          autoComplete="off"
          autoFocus
          aria-invalid={field === "title"}
          aria-describedby={field === "title" ? errorId : undefined}
          disabled={submitting}
        />
        {field === "title" && message ? (
          <FieldError id={errorId}>{message}</FieldError>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={typeId}>
            Asset type <span className="text-destructive">*</span>
          </Label>
          <Select
            id={typeId}
            value={assetType}
            onChange={(event) =>
              setAssetType(event.target.value as ResearchAssetType)
            }
            aria-invalid={field === "assetType"}
            aria-describedby={field === "assetType" ? errorId : undefined}
            disabled={submitting}
          >
            {RESEARCH_ASSET_TYPES.map((option) => (
              <option key={option} value={option}>
                {RESEARCH_ASSET_TYPE_META[option].label}
              </option>
            ))}
          </Select>
          {field === "assetType" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={statusId}>
            Status <span className="text-destructive">*</span>
          </Label>
          <Select
            id={statusId}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as SelectableResearchAssetStatus)
            }
            aria-invalid={field === "status"}
            aria-describedby={field === "status" ? errorId : undefined}
            disabled={submitting}
          >
            {SELECTABLE_RESEARCH_ASSET_STATUSES.map((option) => (
              <option key={option} value={option}>
                {RESEARCH_ASSET_STATUS_META[option].label}
              </option>
            ))}
          </Select>
          {field === "status" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={descriptionId}>Description (optional)</Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What this file will contain — sequence, stain, instrument, anything helpful."
          disabled={submitting}
        />
      </div>

      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        This records the file's details. After you save, use{" "}
        <span className="font-medium text-foreground">Attach image</span> on the
        asset to add a PNG, JPEG, or TIFF file.
      </p>

      {generalError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {generalError}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitLabel}
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

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}
