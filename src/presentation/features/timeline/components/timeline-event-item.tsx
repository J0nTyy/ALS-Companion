import { useRef } from "react";
import { Check, Pencil } from "lucide-react";

import {
  TIMELINE_EVENT_CATEGORY_META,
  TIMELINE_EVENT_STATUS_META,
  type TimelineEvent,
} from "@/domain/entities/timeline-event";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import {
  ConfirmDeleteButton,
  type ConfirmDeleteHandle,
} from "@/presentation/components/confirm-delete-button";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildTimelineEventContextMenu } from "@/presentation/features/context-menu/menus";
import { formatDateOnly } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

/**
 * A single timeline event. Completed events are clearly distinguished from
 * planned ones (status badge); the newest planned event is highlighted. Provides
 * Mark complete (planned only), Edit, and Delete. Actions are omitted for
 * read-only (archived) studies.
 */
export function TimelineEventItem({
  event,
  highlight = false,
  onEdit,
  onMarkComplete,
  onDelete,
}: {
  event: TimelineEvent;
  highlight?: boolean;
  onEdit?: () => void;
  onMarkComplete?: () => void;
  onDelete?: () => Promise<void>;
}) {
  const contextMenu = useContextMenu();
  const deleteRef = useRef<ConfirmDeleteHandle>(null);
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

  const showActions = Boolean(
    onEdit || (isPlanned && onMarkComplete) || onDelete,
  );

  return (
    <div
      onContextMenu={(e) =>
        contextMenu.open(
          e,
          buildTimelineEventContextMenu({
            isPlanned,
            ...(onMarkComplete ? { onMarkComplete } : {}),
            ...(onEdit ? { onEdit } : {}),
            ...(onDelete ? { onDelete: () => deleteRef.current?.open() } : {}),
          }),
        )
      }
      className={cn(
        "rounded-lg border bg-card px-3.5 py-3",
        highlight
          ? "border-primary/60 ring-1 ring-primary/20"
          : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <p className="text-sm font-medium text-foreground">{event.title}</p>
        <Badge variant="outline" className="shrink-0">{category.label}</Badge>
        <Badge variant={statusMeta.tone} className="shrink-0">{statusMeta.label}</Badge>
        {highlight ? (
          <Badge variant="default" className="shrink-0">Next planned</Badge>
        ) : null}
        <span className="w-full text-xs text-muted-foreground">{dateLine}</span>
        {event.notes ? (
          <span className="w-full truncate text-xs text-muted-foreground" title={event.notes}>
            {event.notes}
          </span>
        ) : null}
      </div>

      {showActions ? (
        <div className="mt-2 flex items-center gap-1.5">
          {isPlanned && onMarkComplete ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
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
              className="h-8"
              onClick={onEdit}
              aria-label={`Edit "${event.title}"`}
            >
              <Pencil />
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <ConfirmDeleteButton
              ref={deleteRef}
              iconOnly
              triggerAriaLabel={`Delete "${event.title}"`}
              title="Delete this timeline event?"
              description={
                <>
                  This permanently removes{" "}
                  <span className="font-medium text-foreground">
                    {event.title}
                  </span>
                  {event.category === "mri"
                    ? " and any MRI sessions, assets, and image files attached to it"
                    : ""}
                  . This action cannot be undone.
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
