import { Suspense, useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/presentation/components/theme-toggle";
import { GlobalSearchBox } from "@/presentation/features/search/global-search-box";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useSettings } from "@/shared/hooks/use-settings";
import { recordWorkspacePath } from "@/shared/lib/last-workspace";
import { useUpdater } from "@/presentation/features/updater/updater-context";
import { UpdateBanner } from "@/presentation/features/updater/update-banner";
import { AssistantPanel } from "@/presentation/features/assistant/assistant-panel";
import { useAssistant } from "@/presentation/features/assistant/assistant-context";
import { AppSidebar } from "./app-sidebar";
import { ResizeHandle } from "./resize-handle";
import { useResizablePanel } from "./use-resizable-panel";

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
 * The top-level frame that wraps every screen: a collapsible **left sidebar**, the
 * scrollable content region (router `<Outlet />`), and a dockable **right panel**
 * (the AI assistant for now; a plugin host later). Both side panels are resizable
 * by dragging the bar on their inner edge — the center content flexes to fill
 * whatever space is left, so opening or widening a panel shrinks the center (VS
 * Code style). Widths and the collapse/open choices are remembered.
 */
export function AppShell() {
  const { settings } = useSettings();
  const location = useLocation();
  const updater = useUpdater();
  const {
    available: assistantAvailable,
    open: assistantOpen,
    toggle: toggleAssistant,
    setOpen: setAssistantOpen,
  } = useAssistant();

  // Remembered explicit choice wins; otherwise fall back to the Settings default.
  const [collapsed, setCollapsed] = useState(
    () => readCollapsed() ?? settings.sidebarDefaultCollapsed,
  );

  const sidebar = useResizablePanel({
    storageKey: "als.sidebar.width",
    defaultWidth: 240,
    min: 200,
    max: 480,
    grow: "rightward",
  });
  const rightPanel = useResizablePanel({
    storageKey: "als.assistant.width",
    defaultWidth: 380,
    min: 300,
    max: 640,
    grow: "leftward",
  });

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

  const assistantVisible = assistantAvailable && assistantOpen;

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

      <AppSidebar collapsed={collapsed} width={sidebar.width} onToggle={toggle} />
      {collapsed ? null : (
        <ResizeHandle
          ariaLabel="Resize the sidebar"
          onPointerDown={sidebar.onPointerDown}
          onKeyDown={sidebar.onKeyDown}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <UpdateBanner />
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <GlobalSearchBox />
          <div className="ml-auto flex items-center gap-1">
            {assistantAvailable ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAssistant}
                aria-label={assistantOpen ? "Close the assistant panel" : "Open the assistant panel"}
                aria-pressed={assistantOpen}
                title="Research assistant"
                className={cn(assistantOpen && "bg-accent text-accent-foreground")}
              >
                <Sparkles />
              </Button>
            ) : null}
            <ThemeToggle />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overscroll-none">
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

      {/* Right dock. Kept mounted while hidden so the conversation survives toggling;
          the resize handle only exists while it's visible. */}
      {assistantAvailable ? (
        <>
          {assistantVisible ? (
            <ResizeHandle
              ariaLabel="Resize the assistant panel"
              onPointerDown={rightPanel.onPointerDown}
              onKeyDown={rightPanel.onKeyDown}
            />
          ) : null}
          <aside
            aria-label="Research assistant panel"
            className={cn(
              "h-full shrink-0 flex-col border-l border-border bg-card",
              assistantVisible ? "flex" : "hidden",
            )}
            style={{ width: rightPanel.width }}
          >
            <AssistantPanel open={assistantVisible} onClose={() => setAssistantOpen(false)} />
          </aside>
        </>
      ) : null}
    </div>
  );
}
