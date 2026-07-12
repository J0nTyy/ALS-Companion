import { useId, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import {
  ANIMAL_SEXES,
  ANIMAL_SEX_META,
  type AnimalSex,
} from "@/domain/entities/animal";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { cn } from "@/shared/lib/utils";
import { localDateOnly } from "@/shared/lib/local-date";
import { errorField, toUserMessage } from "@/presentation/lib/error-message";

export interface AnimalFormValues {
  animalIdentifier: string;
  sex: AnimalSex;
  dateOfBirth: string;
  mutation: string;
  treatmentGroup: string;
}

interface AnimalFormProps {
  /** Pre-filled values when editing; omitted when adding. */
  initialValues?: Partial<AnimalFormValues>;
  submitLabel: string;
  /** Persist the values. May throw; the form surfaces the message inline. */
  onSubmit: (values: AnimalFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * The single form used to add and edit an animal. Large controls, explicit
 * labels in researcher language, a native radio group for sex, and calm inline
 * error messages.
 */
export function AnimalForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: AnimalFormProps) {
  const identifierId = useId();
  const dobId = useId();
  const mutationId = useId();
  const groupId = useId();
  const errorId = useId();
  const sexName = useId();
  // Local-day max keeps the picker aligned with the future-date validation rule.
  const max = useMemo(() => localDateOnly(), []);

  const [animalIdentifier, setAnimalIdentifier] = useState(
    initialValues?.animalIdentifier ?? "",
  );
  const [sex, setSex] = useState<AnimalSex>(initialValues?.sex ?? "unknown");
  const [dateOfBirth, setDateOfBirth] = useState(
    initialValues?.dateOfBirth ?? "",
  );
  const [mutation, setMutation] = useState(initialValues?.mutation ?? "");
  const [treatmentGroup, setTreatmentGroup] = useState(
    initialValues?.treatmentGroup ?? "",
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
      await onSubmit({
        animalIdentifier,
        sex,
        dateOfBirth,
        mutation,
        treatmentGroup,
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
        <Label htmlFor={identifierId}>
          Animal ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id={identifierId}
          value={animalIdentifier}
          onChange={(event) => setAnimalIdentifier(event.target.value)}
          placeholder="e.g. M-014 or ear-tag number"
          autoComplete="off"
          autoFocus
          aria-invalid={field === "animalIdentifier"}
          aria-describedby={field === "animalIdentifier" ? errorId : undefined}
          disabled={submitting}
        />
        {field === "animalIdentifier" && message ? (
          <FieldError id={errorId}>{message}</FieldError>
        ) : null}
      </div>

      {/* Native radio group: correct keyboard/AT behavior for free. */}
      <fieldset disabled={submitting} className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Sex</legend>
        <div className="grid grid-cols-3 gap-3">
          {ANIMAL_SEXES.map((option) => (
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
                name={sexName}
                value={option}
                checked={sex === option}
                onChange={() => setSex(option)}
                className="sr-only"
              />
              {ANIMAL_SEX_META[option].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={dobId}>Date of birth (optional)</Label>
        <Input
          id={dobId}
          type="date"
          value={dateOfBirth}
          max={max}
          onChange={(event) => setDateOfBirth(event.target.value)}
          aria-invalid={field === "dateOfBirth"}
          aria-describedby={field === "dateOfBirth" ? errorId : undefined}
          disabled={submitting}
          className="sm:max-w-xs"
        />
        {field === "dateOfBirth" && message ? (
          <FieldError id={errorId}>{message}</FieldError>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={mutationId}>Mutation or genotype (optional)</Label>
        <Input
          id={mutationId}
          value={mutation}
          onChange={(event) => setMutation(event.target.value)}
          placeholder="e.g. SOD1-G93A"
          autoComplete="off"
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={groupId}>Treatment group (optional)</Label>
        <Input
          id={groupId}
          value={treatmentGroup}
          onChange={(event) => setTreatmentGroup(event.target.value)}
          placeholder="e.g. Control, Vehicle, Riluzole — any group you use"
          autoComplete="off"
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
