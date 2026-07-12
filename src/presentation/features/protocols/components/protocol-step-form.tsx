import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  TIMELINE_EVENT_CATEGORIES,
  TIMELINE_EVENT_CATEGORY_META,
  type TimelineEventCategory,
} from "@/domain/entities/timeline-event";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface ProtocolStepFormValues {
  title: string;
  category: TimelineEventCategory;
  offsetDays: number;
  notes: string;
}

interface ProtocolStepFormProps {
  /** Pre-filled values when editing; omitted when adding. */
  initialValues?: Partial<ProtocolStepFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: ProtocolStepFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to add and edit a protocol step. A native select picks the category;
 * the day offset is how many days after an animal is added the step is planned.
 */
export function ProtocolStepForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: ProtocolStepFormProps) {
  const titleId = useId();
  const categoryId = useId();
  const offsetId = useId();
  const offsetHelpId = useId();
  const notesId = useId();
  const errorId = useId();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [category, setCategory] = useState<TimelineEventCategory>(
    initialValues?.category ?? "gene_confirmation",
  );
  const [offsetText, setOffsetText] = useState(
    initialValues?.offsetDays !== undefined
      ? String(initialValues.offsetDays)
      : "0",
  );
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
      const offsetDays =
        offsetText.trim() === "" ? Number.NaN : Number(offsetText);
      await onSubmit({ title, category, offsetDays, notes });
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
          Step title <span className="text-destructive">*</span>
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Baseline MRI scan"
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
          <Label htmlFor={categoryId}>
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            id={categoryId}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as TimelineEventCategory)
            }
            aria-invalid={field === "category"}
            aria-describedby={field === "category" ? errorId : undefined}
            disabled={submitting}
          >
            {TIMELINE_EVENT_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {TIMELINE_EVENT_CATEGORY_META[option].label}
              </option>
            ))}
          </Select>
          {field === "category" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={offsetId}>
            Day offset <span className="text-destructive">*</span>
          </Label>
          <Input
            id={offsetId}
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={offsetText}
            onChange={(event) => setOffsetText(event.target.value)}
            aria-invalid={field === "offsetDays"}
            aria-describedby={
              field === "offsetDays" ? `${offsetHelpId} ${errorId}` : offsetHelpId
            }
            disabled={submitting}
          />
          <p id={offsetHelpId} className="text-xs text-muted-foreground">
            Days after an animal is added (0 = the day it's added).
          </p>
          {field === "offsetDays" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={notesId}>Notes (optional)</Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Any context for this step — protocol details, anything helpful."
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
