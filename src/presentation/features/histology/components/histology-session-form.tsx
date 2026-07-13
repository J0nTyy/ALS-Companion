import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  HISTOLOGY_STAINS,
  HISTOLOGY_STAIN_META,
  type HistologyStain,
} from "@/domain/entities/histology-session";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { localDateOnly } from "@/shared/lib/local-date";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface HistologySessionFormValues {
  stain: HistologyStain;
  acquisitionDate: string;
  tissue: string;
  magnification: string;
  operator: string;
  notes: string;
}

interface HistologySessionFormProps {
  /** Pre-filled values when editing; omitted when creating. */
  initialValues?: Partial<HistologySessionFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: HistologySessionFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to create and edit a histology session's metadata. No image upload —
 * images attach via research assets (below), exactly like MRI. Stain is a native
 * select so future stains appear without any form change.
 */
export function HistologySessionForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: HistologySessionFormProps) {
  const stainId = useId();
  const dateId = useId();
  const tissueId = useId();
  const magnificationId = useId();
  const operatorId = useId();
  const notesId = useId();
  const errorId = useId();

  const [stain, setStain] = useState<HistologyStain>(
    initialValues?.stain ?? "he",
  );
  const [acquisitionDate, setAcquisitionDate] = useState(
    initialValues?.acquisitionDate ?? localDateOnly(),
  );
  const [tissue, setTissue] = useState(initialValues?.tissue ?? "");
  const [magnification, setMagnification] = useState(
    initialValues?.magnification ?? "",
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
        stain,
        acquisitionDate,
        tissue,
        magnification,
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={stainId}>
            Stain <span className="text-destructive">*</span>
          </Label>
          <Select
            id={stainId}
            value={stain}
            onChange={(event) => setStain(event.target.value as HistologyStain)}
            aria-invalid={field === "stain"}
            aria-describedby={field === "stain" ? errorId : undefined}
            disabled={submitting}
            autoFocus
          >
            {HISTOLOGY_STAINS.map((option) => (
              <option key={option} value={option}>
                {HISTOLOGY_STAIN_META[option].label}
              </option>
            ))}
          </Select>
          {field === "stain" && message ? (
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
          <Label htmlFor={tissueId}>Tissue (optional)</Label>
          <Input
            id={tissueId}
            value={tissue}
            onChange={(event) => setTissue(event.target.value)}
            placeholder="e.g. Lumbar spinal cord, motor cortex"
            autoComplete="off"
            disabled={submitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={magnificationId}>Magnification (optional)</Label>
          <Input
            id={magnificationId}
            value={magnification}
            onChange={(event) => setMagnification(event.target.value)}
            placeholder="e.g. 20×, 40× oil"
            autoComplete="off"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={operatorId}>Operator (optional)</Label>
        <Input
          id={operatorId}
          value={operator}
          onChange={(event) => setOperator(event.target.value)}
          placeholder="Who prepared or imaged the section"
          autoComplete="off"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={notesId}>Notes (optional)</Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Any context about this section — protocol, region, anything helpful."
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
