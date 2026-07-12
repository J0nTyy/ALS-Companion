import { Outlet } from "react-router-dom";

import { ThemeToggle } from "@/presentation/components/theme-toggle";
import { GlobalSearchBox } from "@/presentation/features/search/global-search-box";
import { AppSidebar } from "./app-sidebar";

/**
 * The top-level frame that wraps every screen: a fixed sidebar, a slim top bar
 * with the always-available global search, and a scrollable content region
 * rendered via the router's <Outlet />.
 */
export function AppShell() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-6">
          <GlobalSearchBox />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl animate-fade-in px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
