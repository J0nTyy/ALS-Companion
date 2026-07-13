import { NavLink } from "react-router-dom";
import { Activity } from "lucide-react";

import { APP } from "@/shared/config/app";
import { cn } from "@/shared/lib/utils";
import { NAV_ITEMS } from "./navigation";

/**
 * The persistent left navigation. Large targets, clear active state, and a legible
 * hover keep orientation effortless. It collapses to a slim icon rail (driven by
 * {@link AppShell}) so the workspace can hand the width back to the content; labels
 * become native tooltips in that mode, so nothing is lost.
 */
export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card/50 transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 py-4",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        {collapsed ? null : (
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">ALS Research</p>
            <p className="text-xs text-muted-foreground">Companion</p>
          </div>
        )}
      </div>

      <nav className={cn("flex-1 space-y-1 py-2", collapsed ? "px-2" : "px-3")}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                collapsed
                  ? "justify-center px-2 py-2.5"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {collapsed ? null : <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={cn("py-3", collapsed ? "px-2 text-center" : "px-5")}>
        <p className="text-xs text-muted-foreground">
          {collapsed ? `v${APP.version}` : `Version ${APP.version}`}
        </p>
      </div>
    </aside>
  );
}
