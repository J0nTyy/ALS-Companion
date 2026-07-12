import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  MRI_MODALITIES,
  MRI_MODALITY_META,
  type MriModality,
} from "@/domain/entities/mri-session";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { localDateOnly } from "@/shared/lib/local-date";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface MriSessionFormValues {
  title: string;
  modality: MriModality;
  acquisitionDate: string;
  anatomicalRegion: string;
  operator: string;
  notes: string;
}

interface MriSessionFormProps {
  /** Pre-filled values when editing; omitted when creating. */
  initialValues?: Partial<MriSessionFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: MriSessionFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to create and edit an MRI session's metadata. No image upload — that
 * arrives in the future imaging subsystem. Modality is a native select so future
 * modalities appear without any form change.
 */
export function MriSessionForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: MriSessionFormProps) {
  const titleId = useId();
  const modalityId = useId();
  const dateId = useId();
  const regionId = useId();
  const operatorId = useId();
  const notesId = useId();
  const errorId = useId();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [modality, setModality] = useState<MriModality>(
    initialValues?.modality ?? "mri",
  );
  const [acquisitionDate, setAcquisitionDate] = useState(
    initialValues?.acquisitionDate ?? localDateOnly(),
  );
  const [anatomicalRegion, setAnatomicalRegion] = useState(
    initialValues?.anatomicalRegion ?? "",
  );
  const [operator, setOperator] = useState(initialValues?.operator ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [field, setField] = useState<string | undefined>(undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setField(undefined);
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        modality,
        acquisitionDate,
        anatomicalRegion,
        operator,
        notes,
      });
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
          Session title <span className="text-destructive">*</span>
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Baseline brain MRI"
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
          <Label htmlFor={modalityId}>
            Modality <span className="text-destructive">*</span>
          </Label>
          <Select
            id={modalityId}
            value={modality}
            onChange={(event) =>
              setModality(event.target.value as MriModality)
            }
            aria-invalid={field === "modality"}
            aria-describedby={field === "modality" ? errorId : undefined}
            disabled={submitting}
          >
            {MRI_MODALITIES.map((option) => (
              <option key={option} value={option}>
                {MRI_MODALITY_META[option].label}
              </option>
            ))}
          </Select>
          {field === "modality" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={dateId}>
            Acquisition date <span className="text-destructive">*</span>
          </Label>
          <Input
            id={dateId}
            type="date"
            value={acquisitionDate}
            onChange={(event) => setAcquisitionDate(event.target.value)}
            aria-invalid={field === "acquisitionDate"}
            aria-describedby={field === "acquisitionDate" ? errorId : undefined}
            disabled={submitting}
          />
          {field === "acquisitionDate" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={regionId}>Anatomical region (optional)</Label>
          <Input
            id={regionId}
            value={anatomicalRegion}
            onChange={(event) => setAnatomicalRegion(event.target.value)}
            placeholder="e.g. Brain, lumbar spinal cord"
            autoComplete="off"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={operatorId}>Operator (optional)</Label>
          <Input
            id={operatorId}
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
            placeholder="Who acquired the scan"
            autoComplete="off"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={notesId}>Notes (optional)</Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Any context about this session — sequence, protocol, anything helpful."
          disabled={submitting}
        />
      </div>

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
