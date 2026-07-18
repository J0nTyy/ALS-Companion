import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";

import { PageHeader } from "@/presentation/components/page-header";
import { Input } from "@/presentation/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { Markdown } from "./markdown";
// Parsed once in the shared module and reused by the assistant's guide tool, so
// in-app help and AI guide help stay in sync with the shipped documentation.
import { USER_GUIDE } from "@/shared/guide/user-guide";

export function HelpPage() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const guide = USER_GUIDE;

  const q = query.trim().toLowerCase();
  const visibleSections = useMemo(
    () => (q ? guide.sections.filter((s) => s.haystack.includes(q)) : guide.sections),
    [guide.sections, q],
  );

  // Deep-link support: scroll to the section named in the URL hash (from an ⓘ hint).
  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    // Wait a tick for the content to render before scrolling.
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [location.hash, visibleSections.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Guide"
        description="How to use ALS Research Companion — searchable, with a table of contents."
      />

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        {/* Table of contents + search (sticky on desktop). */}
        <aside className="mb-6 lg:mb-0">
          <div className="lg:sticky lg:top-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search the user guide"
                placeholder="Search the guide…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 pr-8"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <nav
              aria-label="Table of contents"
              className="mt-3 max-h-[calc(100vh-10rem)] space-y-0.5 overflow-y-auto pr-1"
            >
              {visibleSections.length === 0 ? (
                <p className="px-2 py-2 text-sm text-muted-foreground">No matches.</p>
              ) : (
                visibleSections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={cn(
                      "block rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {s.title}
                  </a>
                ))
              )}
            </nav>
          </div>
        </aside>

        {/* Rendered guide. */}
        <div ref={contentRef} className="min-w-0">
          {!q && guide.intro ? (
            <div className="mb-4 rounded-lg border border-border bg-card/50 p-4">
              <Markdown source={guide.intro} />
            </div>
          ) : null}

          {visibleSections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sections match “{query}”. Try a different term.
            </p>
          ) : (
            visibleSections.map((s) => (
              <section key={s.id} className="mb-2">
                <Markdown source={s.body} />
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
