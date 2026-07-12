import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  STUDY_STATUSES,
  STUDY_STATUS_META,
  type StudyStatus,
} from "@/domain/entities/study";
import { ValidationError } from "@/application/errors";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Textarea } from "@/presentation/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { toUserMessage } from "../error-message";

export interface StudyFormValues {
  name: string;
  strain: string;
  description: string;
  status: StudyStatus;
}

interface StudyFormProps {
  /** Pre-filled values when editing; omitted when creating. */
  initialValues?: Partial<StudyFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: StudyFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The single form used to create and edit a study. Large controls, explicit
 * labels, keyboard-friendly status selection, and calm inline error messages.
 */
export function StudyForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: StudyFormProps) {
  const nameId = useId();
  const strainId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const statusName = useId();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [strain, setStrain] = useState(initialValues?.strain ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [status, setStatus] = useState<StudyStatus>(
    initialValues?.status ?? "planning",
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | undefined>(undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setErrorField(undefined);
    setSubmitting(true);
    try {
      await onSubmit({ name, strain, description, status });
      // On success the caller navigates away; leave the form disabled.
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrorField(error.field);
      }
      setErrorMessage(
        toUserMessage(
          error,
          "Something went wrong while saving. Please try again.",
        ),
      );
      setSubmitting(false);
    }
  }

  const generalError = errorMessage && !errorField ? errorMessage : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor={nameId}>
          Study name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. SOD1-G93A survival cohort"
          autoComplete="off"
          autoFocus
          aria-invalid={errorField === "name"}
          aria-describedby={errorField === "name" ? errorId : undefined}
          disabled={submitting}
        />
        {errorField === "name" && errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={strainId}>
          Strain or line <span className="text-destructive">*</span>
        </Label>
        <Input
          id={strainId}
          value={strain}
          onChange={(event) => setStrain(event.target.value)}
          placeholder="e.g. SOD1-G93A"
          autoComplete="off"
          aria-invalid={errorField === "strain"}
          aria-describedby={errorField === "strain" ? errorId : undefined}
          disabled={submitting}
        />
        {errorField === "strain" && errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={descriptionId}>Description (optional)</Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this study for? Protocol notes, aims, anything helpful."
          disabled={submitting}
        />
      </div>

      {/*
        Native radio group: the browser provides arrow-key selection, roving
        focus, checked-state announcement, and disabled behavior for free. The
        real <input> is visually hidden; the <label> card is styled from the
        input's state via `has-[...]` variants.
      */}
      <fieldset disabled={submitting} className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">
          Status
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STUDY_STATUSES.map((option) => (
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
                name={statusName}
                value={option}
                checked={status === option}
                onChange={() => setStatus(option)}
                className="sr-only"
              />
              {STUDY_STATUS_META[option].label}
            </label>
          ))}
        </div>
      </fieldset>

      {generalError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {generalError}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
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
