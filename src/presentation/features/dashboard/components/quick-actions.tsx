import { Link } from "react-router-dom";
import {
  Columns2,
  FlaskConical,
  ImagePlus,
  PlusCircle,
  Search,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import type { QuickAction } from "@/application/use-cases/dashboard/dashboard-view";

const ICONS: Record<string, LucideIcon> = {
  "new-study": FlaskConical,
  "new-animal": PlusCircle,
  "record-observation": Stethoscope,
  "create-mri-session": ImagePlus,
  "compare-mri": Columns2,
  search: Search,
};

/** Shortcut buttons to existing routes. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = ICONS[action.id] ?? PlusCircle;
        return (
          <Link
            key={action.id}
            to={action.to}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Icon className="h-4 w-4 text-primary" />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
