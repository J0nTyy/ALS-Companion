import { Check, Pencil } from "lucide-react";

import {
  TIMELINE_EVENT_CATEGORY_META,
  TIMELINE_EVENT_STATUS_META,
  type TimelineEvent,
} from "@/domain/entities/timeline-event";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { formatDateOnly } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

/**
 * A single timeline event. Completed events are clearly distinguished from
 * planned ones (status badge); the newest planned event is highlighted. Provides
 * Mark complete (planned only) and Edit. There is no delete — history is
 * permanent. Actions are omitted for read-only (archived) studies.
 */
export function TimelineEventItem({
  event,
  highlight = false,
  onEdit,
  onMarkComplete,
}: {
  event: TimelineEvent;
  highlight?: boolean;
  onEdit?: () => void;
  onMarkComplete?: () => void;
}) {
  const category = TIMELINE_EVENT_CATEGORY_META[event.category];
  const statusMeta = TIMELINE_EVENT_STATUS_META[event.status];
  const isPlanned = event.status === "planned";

  const dateParts: string[] = [];
  if (event.plannedDate) {
    dateParts.push(`Planned ${formatDateOnly(event.plannedDate)}`);
  }
  if (event.completedDate) {
    dateParts.push(`Completed ${formatDateOnly(event.completedDate)}`);
  }
  const dateLine = dateParts.length > 0 ? dateParts.join(" · ") : "No date set";

  const showActions = Boolean(onEdit || (isPlanned && onMarkComplete));

  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-5 py-4",
        highlight
          ? "border-primary/60 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className="font-medium text-foreground">{event.title}</p>
        <Badge variant="outline">{category.label}</Badge>
        <Badge variant={statusMeta.tone}>{statusMeta.label}</Badge>
        {highlight ? <Badge variant="default">Next planned</Badge> : null}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">{dateLine}</p>

      {event.notes ? (
        <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>
      ) : null}

      {showActions ? (
        <div className="mt-3 flex items-center gap-2">
          {isPlanned && onMarkComplete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkComplete}
              aria-label={`Mark "${event.title}" complete`}
            >
              <Check />
              Mark complete
            </Button>
          ) : null}
          {onEdit ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label={`Edit "${event.title}"`}
            >
              <Pencil />
              Edit
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
