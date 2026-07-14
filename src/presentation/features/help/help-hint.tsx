import { Link } from "react-router-dom";
import { Info } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import type { HelpSection } from "./help-sections";

/**
 * A small information (ⓘ) icon that deep-links to the relevant section of the
 * in-app User Guide. Place it next to a feature's title/control so a researcher can
 * jump straight to "how this works". Purely a navigation affordance — it opens the
 * Help page at the linked section.
 */
export function HelpHint({
  section,
  label,
  className,
}: {
  section: HelpSection;
  /** Accessible label, e.g. "annotations". Announced as "Help: <label>". */
  label: string;
  className?: string;
}) {
  return (
    <Link
      to={`/help#${section}`}
      aria-label={`Help: ${label}`}
      title={`Help: ${label}`}
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors",
        "hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}
