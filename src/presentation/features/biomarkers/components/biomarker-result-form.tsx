import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { COMMON_BIOMARKERS } from "@/domain/entities/biomarker-result";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Textarea } from "@/presentation/components/ui/textarea";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface BiomarkerResultFormValues {
  biomarkerName: string;
  value: string;
  unit: string;
  method: string;
  notes: string;
}

interface BiomarkerResultFormProps {
  initialValues?: Partial<BiomarkerResultFormValues>;
  submitLabel: string;
  onSubmit: (values: BiomarkerResultFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to add / edit one laboratory result. `biomarkerName` is free text with a
 * datalist of common biomarkers (suggestions only — any name is allowed). `value`
 * is free text so qualitative readouts ("< 0.05", "not detected") are captured
 * verbatim. Manual entry only — no lab-instrument import.
 */
export function BiomarkerResultForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: BiomarkerResultFormProps) {
  const nameId = useId();
  const nameListId = useId();
  const valueId = useId();
  const unitId = useId();
  const methodId = useId();
  const notesId = useId();
  const errorId = useId();

  const [biomarkerName, setBiomarkerName] = useState(
    initialValues?.biomarkerName ?? "",
  );
  const [value, setValue] = useState(initialValues?.value ?? "");
  const [unit, setUnit] = useState(initialValues?.unit ?? "");
  const [method, setMethod] = useState(initialValues?.method ?? "");
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
      await onSubmit({ biomarkerName, value, unit, method, notes });
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={nameId}>
            Biomarker <span className="text-destructive">*</span>
          </Label>
          <Input
            id={nameId}
            list={nameListId}
            value={biomarkerName}
            onChange={(event) => setBiomarkerName(event.target.value)}
            placeholder="e.g. Neurofilament Light (NfL)"
            autoComplete="off"
            autoFocus
            aria-invalid={field === "biomarkerName"}
            aria-describedby={field === "biomarkerName" ? errorId : undefined}
            disabled={submitting}
          />
          <datalist id={nameListId}>
            {COMMON_BIOMARKERS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {field === "biomarkerName" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={valueId}>
            Value <span className="text-destructive">*</span>
          </Label>
          <Input
            id={valueId}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. 45.2 or < 0.05"
            autoComplete="off"
            aria-invalid={field === "value"}
            aria-describedby={field === "value" ? errorId : undefined}
            disabled={submitting}
          />
          {field === "value" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={unitId}>Unit (optional)</Label>
          <Input
            id={unitId}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="e.g. pg/mL"
            autoComplete="off"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={methodId}>Method (optional)</Label>
          <Input
            id={methodId}
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            placeholder="e.g. ELISA, Western blot, qPCR"
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
          placeholder="Any context about this measurement."
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
