import { NavLink } from "react-router-dom";
import { Activity } from "lucide-react";

import { APP } from "@/shared/config/app";
import { cn } from "@/shared/lib/utils";
import { NAV_ITEMS } from "./navigation";

/**
 * The persistent left navigation. Large targets, generous spacing, and a clear
 * active state keep orientation effortless for non-technical users.
 */
export function AppSidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/50">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">ALS Research</p>
          <p className="text-xs text-muted-foreground">Companion</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Version {APP.version}
        </p>
      </div>
    </aside>
  );
}
