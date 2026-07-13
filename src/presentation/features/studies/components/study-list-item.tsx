import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import type { Study } from "@/domain/entities/study";
import { formatDate } from "@/shared/lib/format";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildStudyContextMenu } from "@/presentation/features/context-menu/menus";
import { StudyStatusBadge } from "./study-status-badge";

/** A single study in the list — a large, keyboard-focusable link to its detail. */
export function StudyListItem({ study }: { study: Study }) {
  const navigate = useNavigate();
  const contextMenu = useContextMenu();
  const to = `/studies/${study.id}`;

  return (
    <Link
      to={to}
      onContextMenu={(e) =>
        contextMenu.open(e, buildStudyContextMenu({ onOpen: () => navigate(to) }))
      }
      className="group flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <p className="truncate font-medium text-foreground">{study.name}</p>
          <StudyStatusBadge status={study.status} />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {study.strain} · Updated {formatDate(study.updatedAt)}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
