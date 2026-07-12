import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import type { SearchResultGroup } from "@/application/ports/search";

/**
 * Renders search results grouped by entity type. Each hit is a link to the
 * entity's page, so a researcher can jump straight to a match. Purely
 * presentational — grouping and ordering are decided by the search service.
 */
export function SearchResultList({ groups }: { groups: SearchResultGroup[] }) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.type} aria-label={group.label} className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {group.label}
            </h2>
            <span className="text-xs text-muted-foreground">
              {group.hits.length}
            </span>
          </div>

          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {group.hits.map((hit) => (
              <li key={`${hit.type}:${hit.id}`}>
                <Link
                  to={hit.route}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {hit.title}
                    </p>
                    {hit.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {hit.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
