import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Badge } from "@/presentation/components/ui/badge";

/** Read the remembered open state for a section, defaulting to `fallback`. */
function readOpen(key: string | undefined, fallback: boolean): boolean {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

/**
 * A framed, collapsible content section with a header (title, optional count badge,
 * optional right-aligned action) and a chevron toggle. Expanded by default; the
 * open/closed choice is remembered per `storageKey`. The action slot is outside the
 * toggle button, so using it never collapses the section.
 */
export function CollapsibleSection({
  title,
  description,
  count,
  action,
  defaultOpen = true,
  storageKey,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** Optional count shown as a badge next to the title. */
  count?: number;
  /** Right-aligned controls (e.g. an "Add" button). Not part of the toggle. */
  action?: ReactNode;
  defaultOpen?: boolean;
  /** localStorage key to remember the open state (per study/animal + section). */
  storageKey?: string;
  children: ReactNode;
  className?: string;
}) {
  const bodyId = useId();
  const [open, setOpen] = useState(() => readOpen(storageKey, defaultOpen));

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      // Remembering the choice is best-effort.
    }
  }, [open, storageKey]);

  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="group flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open ? "" : "-rotate-90",
            )}
            aria-hidden="true"
          />
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-semibold tracking-tight text-foreground group-focus-visible:underline">
              {title}
            </span>
            {count !== undefined ? (
              <Badge variant="secondary" className="shrink-0">
                {count}
              </Badge>
            ) : null}
          </span>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {open ? (
        <div id={bodyId} className="border-t border-border px-4 py-4">
          {description ? (
            <p className="mb-4 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}
