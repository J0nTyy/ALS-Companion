import { NavLink } from "react-router-dom";
import { Activity, BookOpen, PanelLeft } from "lucide-react";

import { APP } from "@/shared/config/app";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { NAV_ITEMS } from "./navigation";

/**
 * The persistent left navigation. Large targets, clear active state, and a legible
 * hover keep orientation effortless. It collapses to a slim icon rail (driven by
 * {@link AppShell}) so the workspace can hand the width back to the content; labels
 * become native tooltips in that mode, so nothing is lost. The collapse toggle lives
 * here, right-aligned beside the logo/title (centered when collapsed).
 */
export function AppSidebar({
  collapsed = false,
  width = 240,
  onToggle,
}: {
  collapsed?: boolean;
  /** Expanded width in px (resizable via the shell's drag handle). */
  width?: number;
  onToggle: () => void;
}) {
  const toggleButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <PanelLeft />
    </Button>
  );

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card/50",
        collapsed && "w-16",
      )}
      style={collapsed ? undefined : { width }}
    >
      <div
        className={cn(
          "flex py-4",
          collapsed ? "flex-col items-center gap-2 px-2" : "items-center gap-3 px-3",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        {collapsed ? null : (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">
              ALS Research
            </p>
            <p className="text-xs text-muted-foreground">Companion</p>
          </div>
        )}
        {toggleButton}
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

      {/* Documentation link, sitting directly above the version number. */}
      <div className={cn("border-t border-border py-2", collapsed ? "px-2" : "px-3")}>
        <NavLink
          to="/help"
          title={collapsed ? "User Guide" : undefined}
          aria-label="User Guide"
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          {collapsed ? null : <span>User Guide</span>}
        </NavLink>
      </div>

      <div className={cn("py-3", collapsed ? "px-2 text-center" : "px-5")}>
        <p className="text-xs text-muted-foreground">
          {collapsed ? `v${APP.version}` : `Version ${APP.version}`}
        </p>
      </div>
    </aside>
  );
}
