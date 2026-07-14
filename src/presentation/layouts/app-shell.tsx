import { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { ThemeToggle } from "@/presentation/components/theme-toggle";
import { GlobalSearchBox } from "@/presentation/features/search/global-search-box";
import { useSettings } from "@/shared/hooks/use-settings";
import { recordWorkspacePath } from "@/shared/lib/last-workspace";
import { useUpdater } from "@/presentation/features/updater/updater-context";
import { UpdateBanner } from "@/presentation/features/updater/update-banner";
import { AppSidebar } from "./app-sidebar";

const COLLAPSE_KEY = "als.sidebar.collapsed";

/**
 * The remembered collapse choice, or `null` if the user hasn't toggled it yet — in
 * which case the caller falls back to the "sidebar default collapsed" setting.
 */
function readCollapsed(): boolean | null {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return raw === null ? null : raw === "1";
  } catch {
    return null;
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
  const { settings } = useSettings();
  const location = useLocation();
  const updater = useUpdater();
  // Remembered explicit choice wins; otherwise fall back to the Settings default.
  const [collapsed, setCollapsed] = useState(
    () => readCollapsed() ?? settings.sidebarDefaultCollapsed,
  );

  // Quietly check for an update once on launch (offline failures are swallowed).
  useEffect(() => {
    void updater.check({ silent: true });
    // Run once for the app session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remember the last study/animal the researcher visited (for the dashboard's
  // "resume" card), when the preference is on.
  useEffect(() => {
    recordWorkspacePath(location.pathname, settings.rememberLastWorkspace);
  }, [location.pathname, settings.rememberLastWorkspace]);

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
      {settings.enhancedKeyboardNav ? (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to main content
        </a>
      ) : null}

      <AppSidebar collapsed={collapsed} onToggle={toggle} />

      <div className="flex min-w-0 flex-1 flex-col">
        <UpdateBanner />
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <GlobalSearchBox />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-2xl animate-fade-in px-6 py-6">
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center py-24 text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Loading…</span>
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
