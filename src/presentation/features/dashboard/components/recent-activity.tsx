import { Link } from "react-router-dom";
import {
  FileStack,
  FlaskConical,
  Image as ImageIcon,
  ListChecks,
  Mouse,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import type {
  ActivityGroup,
  DashboardActivityType,
} from "@/application/use-cases/dashboard/dashboard-view";
import { formatDateOnly } from "@/shared/lib/format";

const ICONS: Record<DashboardActivityType, LucideIcon> = {
  study: FlaskConical,
  animal: Mouse,
  timeline_event: ListChecks,
  observation: Stethoscope,
  mri_session: ImageIcon,
  research_asset: FileStack,
};

/**
 * A merged, day-grouped feed of the most recent actions across every entity.
 * Reuses existing entities' `updatedAt` — nothing is fabricated.
 */
export function RecentActivity({ groups }: { groups: ActivityGroup[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label === group.key ? formatDateOnly(group.key) : group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.type];
              return (
                <li key={`${item.type}:${item.id}`}>
                  <Link
                    to={item.route}
                    className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {item.title}
                    </span>
                    {item.subtitle ? (
                      <span className="shrink-0 truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
