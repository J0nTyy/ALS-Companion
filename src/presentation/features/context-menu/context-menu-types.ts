import type { LucideIcon } from "lucide-react";

/**
 * Data model for the global, desktop-style context menu (v1.5.2). Menus are
 * DATA-DRIVEN: each entity contributes a list of entries (built by the pure
 * builders in `menus.ts`), and the single {@link ContextMenuProvider} renders
 * them. Presentation components only *request* a menu — they never render one.
 */

export interface ContextMenuItem {
  /** Stable id (unique within a menu) — also used as the React key. */
  id: string;
  label: string;
  /** The action to run when chosen. Absent for a disabled placeholder. */
  onSelect?: () => void;
  /** A disabled item — shown greyed out (e.g. a future-feature placeholder). */
  disabled?: boolean;
  /** Destructive styling (e.g. Delete). */
  danger?: boolean;
  /** Display-only shortcut hint (e.g. "Enter", "F2", "Delete", "R"). */
  shortcut?: string;
  /** Toggle state — renders a check mark (e.g. "Sync zoom" on/off). */
  checked?: boolean;
  icon?: LucideIcon;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

export function isSeparator(
  entry: ContextMenuEntry,
): entry is ContextMenuSeparator {
  return "separator" in entry;
}

/** The minimal slice of a pointer event the menu needs to position itself. */
export interface ContextMenuTrigger {
  preventDefault(): void;
  /** Stops the event bubbling so a nested target's menu wins over its ancestors'. */
  stopPropagation(): void;
  clientX: number;
  clientY: number;
}

/**
 * The service presentation depends on: open a menu at a pointer position with a
 * set of entries, or close the current one. Injected via {@link ContextMenuProvider}.
 */
export interface ContextMenuService {
  open(trigger: ContextMenuTrigger, entries: ContextMenuEntry[]): void;
  close(): void;
}
