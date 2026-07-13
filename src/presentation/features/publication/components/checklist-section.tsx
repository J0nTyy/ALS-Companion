import { useId } from "react";

import { Button } from "@/presentation/components/ui/button";

export interface ChecklistItem {
  id: string;
  label: string;
  subtitle?: string;
}

/**
 * A selectable section for the publication workspace: a titled list of checkboxes
 * with "All" / "None" shortcuts and a live selected/total count. Renders an honest
 * note when there are no items.
 */
export function ChecklistSection({
  title,
  items,
  selectedIds,
  onToggle,
  onAll,
  onNone,
}: {
  title: string;
  items: ChecklistItem[];
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  const selected = new Set(selectedIds);
  const groupId = useId();

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {title}{" "}
          <span className="font-normal text-muted-foreground">
            ({items.filter((i) => selected.has(i.id)).length}/{items.length})
          </span>
        </h3>
        {items.length > 0 ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onAll}>
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={onNone}>
              None
            </Button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="max-h-56 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => onToggle(item.id)}
                  aria-describedby={item.subtitle ? `${groupId}-${item.id}` : undefined}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {item.label}
                  </span>
                  {item.subtitle ? (
                    <span
                      id={`${groupId}-${item.id}`}
                      className="block truncate text-xs text-muted-foreground"
                    >
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
