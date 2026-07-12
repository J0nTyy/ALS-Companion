import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * A dashboard section card with a title, optional "view all" link, and a
 * guaranteed honest empty state — cards stay readable with no data.
 */
export function DashboardCard({
  title,
  icon,
  action,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: { label: string; to: string };
  isEmpty: boolean;
  emptyText: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
        </h2>
        {action ? (
          <Link
            to={action.to}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </section>
  );
}
