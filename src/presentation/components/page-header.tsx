import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { HelpHint } from "@/presentation/features/help/help-hint";
import type { HelpSection } from "@/presentation/features/help/help-sections";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional actions (buttons) rendered on the right. */
  actions?: ReactNode;
  /** When set, an ⓘ hint next to the title deep-links to this User Guide section. */
  help?: HelpSection;
  className?: string;
}

/**
 * The consistent heading block at the top of every screen. Gives each page a
 * clear title and one-line purpose so first-time users always know where they
 * are and what the screen is for.
 */
export function PageHeader({
  title,
  description,
  actions,
  help,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          {title}
          {help ? <HelpHint section={help} label={title} className="h-6 w-6" /> : null}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
