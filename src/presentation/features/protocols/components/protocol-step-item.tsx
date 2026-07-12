import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";

import {
  TIMELINE_EVENT_CATEGORY_META,
  type TimelineEventCategory,
} from "@/domain/entities/timeline-event";
import type { ProtocolStep } from "@/domain/entities/protocol-template";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";

function offsetLabel(days: number): string {
  if (days === 0) return "Day of creation";
  return `+${days} day${days === 1 ? "" : "s"}`;
}

/**
 * A single protocol step in the workflow list. Read-only studies show no actions.
 * "Remove" takes the step out of the template only — it never affects timeline
 * events already generated for animals.
 */
export function ProtocolStepItem({
  step,
  position,
  isFirst,
  isLast,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ProtocolStep;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const category =
    TIMELINE_EVENT_CATEGORY_META[step.category as TimelineEventCategory];
  const showActions = Boolean(onEdit || onRemove || onMoveUp || onMoveDown);

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-card px-5 py-4">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      >
        {position}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="font-medium text-foreground">{step.title}</p>
          <Badge variant="outline">{category.label}</Badge>
          <Badge variant="secondary">{offsetLabel(step.offsetDays)}</Badge>
        </div>
        {step.notes ? (
          <p className="mt-1 text-sm text-muted-foreground">{step.notes}</p>
        ) : null}
      </div>

      {showActions ? (
        <div className="flex shrink-0 items-center gap-1">
          {onMoveUp ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label={`Move "${step.title}" up`}
            >
              <ArrowUp />
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveDown}
              disabled={isLast}
              aria-label={`Move "${step.title}" down`}
            >
              <ArrowDown />
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label={`Edit "${step.title}"`}
            >
              <Pencil />
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              aria-label={`Remove "${step.title}" from the protocol`}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
