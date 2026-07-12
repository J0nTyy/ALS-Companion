import { useId, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  OBSERVATION_KINDS,
  OBSERVATION_KIND_META,
  type ObservationKind,
} from "@/domain/entities/observation";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Textarea } from "@/presentation/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { localDateOnly } from "@/shared/lib/local-date";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface ObservationFormValues {
  kind: ObservationKind;
  observedOn: string;
  value: number;
  scaleName: string;
  notes: string;
}

interface ObservationFormProps {
  /** Pre-filled values when editing; omitted when recording new. */
  initialValues?: Partial<ObservationFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: ObservationFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to record and edit an observation. A native radio picks what was
 * measured; body weight is fixed to grams; motor assessment requires a named
 * scale. The date defaults to today and cannot be in the future.
 */
export function ObservationForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: ObservationFormProps) {
  const kindName = useId();
  const dateId = useId();
  const valueId = useId();
  const scaleId = useId();
  const scaleHelpId = useId();
  const notesId = useId();
  const errorId = useId();
  const max = useMemo(() => localDateOnly(), []);

  const [kind, setKind] = useState<ObservationKind>(
    initialValues?.kind ?? "body_weight",
  );
  const [observedOn, setObservedOn] = useState(
    initialValues?.observedOn ?? localDateOnly(),
  );
  const [valueText, setValueText] = useState(
    initialValues?.value !== undefined ? String(initialValues.value) : "",
  );
  const [scaleName, setScaleName] = useState(initialValues?.scaleName ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [field, setField] = useState<string | undefined>(undefined);

  const isMotor = kind === "motor_score";
  const valueFieldLabel = isMotor ? "Score" : "Weight in grams";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setField(undefined);
    setSubmitting(true);
    try {
      const numeric =
        valueText.trim() === "" ? Number.NaN : Number(valueText);
      await onSubmit({ kind, observedOn, value: numeric, scaleName, notes });
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
      <fieldset disabled={submitting} className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">
          What did you measure?
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OBSERVATION_KINDS.map((option) => (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-foreground",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
              )}
            >
              <input
                type="radio"
                name={kindName}
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="sr-only"
              />
              {OBSERVATION_KIND_META[option].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={dateId}>
            Date recorded <span className="text-destructive">*</span>
          </Label>
          <Input
            id={dateId}
            type="date"
            value={observedOn}
            max={max}
            onChange={(event) => setObservedOn(event.target.value)}
            aria-invalid={field === "observedOn"}
            aria-describedby={field === "observedOn" ? errorId : undefined}
            disabled={submitting}
          />
          {field === "observedOn" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={valueId}>
            {valueFieldLabel} <span className="text-destructive">*</span>
          </Label>
          <Input
            id={valueId}
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={valueText}
            onChange={(event) => setValueText(event.target.value)}
            placeholder={isMotor ? "e.g. 3" : "e.g. 24.5"}
            aria-invalid={field === "value"}
            aria-describedby={field === "value" ? errorId : undefined}
            disabled={submitting}
          />
          {field === "value" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>
      </div>

      {isMotor ? (
        <div className="space-y-2">
          <Label htmlFor={scaleId}>
            Scale used <span className="text-destructive">*</span>
          </Label>
          <Input
            id={scaleId}
            value={scaleName}
            onChange={(event) => setScaleName(event.target.value)}
            placeholder="e.g. your lab's validated motor scale (such as a 0–5 score)"
            autoComplete="off"
            aria-invalid={field === "scaleName"}
            aria-describedby={
              field === "scaleName" ? `${scaleHelpId} ${errorId}` : scaleHelpId
            }
            disabled={submitting}
          />
          <p id={scaleHelpId} className="text-xs text-muted-foreground">
            Name the scoring scale you used. Recording it keeps the score
            interpretable to anyone reviewing the data later.
          </p>
          {field === "scaleName" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>
      ) : null}

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
