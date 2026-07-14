import { Pencil } from "lucide-react";

import {
  OBSERVATION_KIND_META,
  type Observation,
} from "@/domain/entities/observation";
import { Button } from "@/presentation/components/ui/button";
import { ConfirmDeleteButton } from "@/presentation/components/confirm-delete-button";
import { formatDateOnly } from "@/shared/lib/format";

/**
 * A single observation — calm and scannable. The Edit and Delete actions are shown
 * only when their handlers are provided (omitted for archived, read-only studies).
 */
export function ObservationListItem({
  observation,
  onEdit,
  onDelete,
}: {
  observation: Observation;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const meta = OBSERVATION_KIND_META[observation.kind];
  const valueDisplay =
    observation.kind === "body_weight"
      ? `${observation.value} g`
      : `Score ${observation.value}`;

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium text-foreground">{meta.label}</span>
        <span className="text-sm text-foreground">{valueDisplay}</span>
        {observation.kind === "motor_score" && observation.scaleName ? (
          <span className="text-xs text-muted-foreground">{observation.scaleName}</span>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {formatDateOnly(observation.observedOn)}
        </span>
        {observation.notes ? (
          <span
            className="w-full truncate text-xs text-muted-foreground"
            title={observation.notes}
          >
            {observation.notes}
          </span>
        ) : null}
      </div>
      {onEdit || onDelete ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {onEdit ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={onEdit}
              aria-label={`Edit ${meta.label} from ${formatDateOnly(observation.observedOn)}`}
            >
              <Pencil />
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <ConfirmDeleteButton
              iconOnly
              triggerAriaLabel={`Delete ${meta.label} from ${formatDateOnly(observation.observedOn)}`}
              title="Delete this observation?"
              description={
                <>
                  This permanently removes the {meta.label.toLowerCase()}{" "}
                  recorded on {formatDateOnly(observation.observedOn)}. This
                  action cannot be undone.
                </>
              }
              onConfirm={onDelete}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
