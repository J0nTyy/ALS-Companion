import { Link } from "react-router-dom";

export interface SummaryRow {
  key: string;
  title: string;
  subtitle?: string;
  meta?: string;
  to: string;
}

/** A compact list of linked rows (title + optional subtitle + optional meta). */
export function SummaryList({ rows }: { rows: SummaryRow[] }) {
  return (
    <ul className="space-y-0.5">
      {rows.map((row) => (
        <li key={row.key}>
          <Link
            to={row.to}
            className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-foreground">
                {row.title}
              </span>
              {row.subtitle ? (
                <span className="block truncate text-xs text-muted-foreground">
                  {row.subtitle}
                </span>
              ) : null}
            </span>
            {row.meta ? (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {row.meta}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
