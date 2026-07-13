import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  BIOMARKER_SAMPLE_TYPES,
  BIOMARKER_SAMPLE_TYPE_META,
  type BiomarkerSampleType,
} from "@/domain/entities/biomarker-sample";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { localDateOnly } from "@/shared/lib/local-date";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface BiomarkerSampleFormValues {
  sampleType: BiomarkerSampleType;
  collectionDate: string;
  operator: string;
  notes: string;
}

interface BiomarkerSampleFormProps {
  initialValues?: Partial<BiomarkerSampleFormValues>;
  submitLabel: string;
  onSubmit: (values: BiomarkerSampleFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to create / edit a biomarker sample. Sample type is a native select so
 * future types appear without any form change. The sample's laboratory values are
 * added separately as results (manual entry only).
 */
export function BiomarkerSampleForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: BiomarkerSampleFormProps) {
  const typeId = useId();
  const dateId = useId();
  const operatorId = useId();
  const notesId = useId();
  const errorId = useId();

  const [sampleType, setSampleType] = useState<BiomarkerSampleType>(
    initialValues?.sampleType ?? "blood",
  );
  const [collectionDate, setCollectionDate] = useState(
    initialValues?.collectionDate ?? localDateOnly(),
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
      await onSubmit({ sampleType, collectionDate, operator, notes });
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={typeId}>
            Sample type <span className="text-destructive">*</span>
          </Label>
          <Select
            id={typeId}
            value={sampleType}
            onChange={(event) =>
              setSampleType(event.target.value as BiomarkerSampleType)
            }
            aria-invalid={field === "sampleType"}
            aria-describedby={field === "sampleType" ? errorId : undefined}
            disabled={submitting}
            autoFocus
          >
            {BIOMARKER_SAMPLE_TYPES.map((option) => (
              <option key={option} value={option}>
                {BIOMARKER_SAMPLE_TYPE_META[option].label}
              </option>
            ))}
          </Select>
          {field === "sampleType" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={dateId}>
            Collection date <span className="text-destructive">*</span>
          </Label>
          <Input
            id={dateId}
            type="date"
            value={collectionDate}
            onChange={(event) => setCollectionDate(event.target.value)}
            aria-invalid={field === "collectionDate"}
            aria-describedby={field === "collectionDate" ? errorId : undefined}
            disabled={submitting}
          />
          {field === "collectionDate" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={operatorId}>Operator (optional)</Label>
        <Input
          id={operatorId}
          value={operator}
          onChange={(event) => setOperator(event.target.value)}
          placeholder="Who collected or processed the sample"
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
          placeholder="Any context about this sample — collection, storage, anything helpful."
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
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
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
