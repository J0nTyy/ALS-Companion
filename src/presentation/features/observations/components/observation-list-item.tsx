import { Pencil } from "lucide-react";

import {
  OBSERVATION_KIND_META,
  type Observation,
} from "@/domain/entities/observation";
import { Button } from "@/presentation/components/ui/button";
import { formatDateOnly } from "@/shared/lib/format";

/**
 * A single observation — calm and scannable. The Edit action is shown only when
 * `onEdit` is provided (omitted for archived, read-only studies).
 */
export function ObservationListItem({
  observation,
  onEdit,
}: {
  observation: Observation;
  onEdit?: () => void;
}) {
  const meta = OBSERVATION_KIND_META[observation.kind];
  const valueDisplay =
    observation.kind === "body_weight"
      ? `${observation.value} g`
      : `Score ${observation.value}`;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-card px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="font-medium text-foreground">{meta.label}</span>
          <span className="text-sm text-muted-foreground">
            {formatDateOnly(observation.observedOn)}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground">
          {valueDisplay}
          {observation.kind === "motor_score" && observation.scaleName ? (
            <span className="text-muted-foreground">
              {" · "}
              {observation.scaleName}
            </span>
          ) : null}
        </p>
        {observation.notes ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {observation.notes}
          </p>
        ) : null}
      </div>
      {onEdit ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={`Edit ${meta.label} from ${formatDateOnly(observation.observedOn)}`}
        >
          <Pencil />
          Edit
        </Button>
      ) : null}
    </div>
  );
}
