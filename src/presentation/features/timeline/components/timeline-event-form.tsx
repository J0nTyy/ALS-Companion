import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  TIMELINE_EVENT_CATEGORIES,
  TIMELINE_EVENT_CATEGORY_META,
  TIMELINE_EVENT_STATUSES,
  TIMELINE_EVENT_STATUS_META,
  type TimelineEventCategory,
  type TimelineEventStatus,
} from "@/domain/entities/timeline-event";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface TimelineEventFormValues {
  title: string;
  category: TimelineEventCategory;
  status: TimelineEventStatus;
  plannedDate: string;
  completedDate: string;
  notes: string;
}

interface TimelineEventFormProps {
  /** Pre-filled values when editing; omitted when adding. */
  initialValues?: Partial<TimelineEventFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: TimelineEventFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The form to add and edit a timeline event. A native select picks the category;
 * a native radio group picks the status. Planned/completed dates are optional and
 * may be in the future (a planned step is legitimately future-dated).
 */
export function TimelineEventForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: TimelineEventFormProps) {
  const titleId = useId();
  const categoryId = useId();
  const statusName = useId();
  const plannedId = useId();
  const completedId = useId();
  const notesId = useId();
  const errorId = useId();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [category, setCategory] = useState<TimelineEventCategory>(
    initialValues?.category ?? "gene_confirmation",
  );
  const [status, setStatus] = useState<TimelineEventStatus>(
    initialValues?.status ?? "planned",
  );
  const [plannedDate, setPlannedDate] = useState(
    initialValues?.plannedDate ?? "",
  );
  const [completedDate, setCompletedDate] = useState(
    initialValues?.completedDate ?? "",
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
      await onSubmit({
        title,
        category,
        status,
        plannedDate,
        completedDate,
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
          Event title <span className="text-destructive">*</span>
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Confirm SOD1 genotype"
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

      <fieldset disabled={submitting} className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">
          Status
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {TIMELINE_EVENT_STATUSES.map((option) => (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors",
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
              {TIMELINE_EVENT_STATUS_META[option].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={plannedId}>Planned date (optional)</Label>
          <Input
            id={plannedId}
            type="date"
            value={plannedDate}
            onChange={(event) => setPlannedDate(event.target.value)}
            aria-invalid={field === "plannedDate"}
            aria-describedby={field === "plannedDate" ? errorId : undefined}
            disabled={submitting}
          />
          {field === "plannedDate" && message ? (
            <FieldError id={errorId}>{message}</FieldError>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={completedId}>Completed date (optional)</Label>
          <Input
            id={completedId}
            type="date"
            value={completedDate}
            onChange={(event) => setCompletedDate(event.target.value)}
            aria-invalid={field === "completedDate"}
            aria-describedby={field === "completedDate" ? errorId : undefined}
            disabled={submitting}
          />
          {field === "completedDate" && message ? (
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
          placeholder="Any context about this step — protocol, operator, anything helpful."
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
