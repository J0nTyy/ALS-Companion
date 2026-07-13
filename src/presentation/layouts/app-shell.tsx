import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { PanelLeft } from "lucide-react";

import { Button } from "@/presentation/components/ui/button";
import { ThemeToggle } from "@/presentation/components/theme-toggle";
import { GlobalSearchBox } from "@/presentation/features/search/global-search-box";
import { AppSidebar } from "./app-sidebar";

const COLLAPSE_KEY = "als.sidebar.collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * The top-level frame that wraps every screen: a collapsible sidebar, a slim top
 * bar with the collapse toggle and always-available global search, and a
 * scrollable content region rendered via the router's <Outlet />.
 *
 * Collapsing the sidebar to an icon rail hands its width back to the content,
 * which flexes to fill the available space — the workspace stays responsive on
 * both narrow laptops and wide desktop monitors. The choice is remembered.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Persisting the preference is best-effort; the app works without it.
      }
      return next;
    });
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <AppSidebar collapsed={collapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft />
          </Button>
          <GlobalSearchBox />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-2xl animate-fade-in px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
