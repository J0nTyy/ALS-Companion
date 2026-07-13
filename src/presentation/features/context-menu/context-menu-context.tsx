import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { isEditableTarget } from "./native-suppression";
import {
  isSeparator,
  type ContextMenuEntry,
  type ContextMenuService,
  type ContextMenuTrigger,
} from "./context-menu-types";

const ContextMenuContext = createContext<ContextMenuService | null>(null);

interface OpenMenu {
  x: number;
  y: number;
  entries: ContextMenuEntry[];
}

/**
 * Global context-menu system (v1.5.2). Does two things:
 *
 * 1. **Suppresses the native browser menu** everywhere except editable fields, so
 *    the app feels like a desktop program (right-click still copies/pastes inside
 *    inputs and textareas).
 * 2. **Renders one data-driven menu** on request. Components call
 *    `useContextMenu().open(event, entries)` from an `onContextMenu` handler; the
 *    entries come from the pure builders in `menus.ts`.
 */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<OpenMenu | null>(null);

  const open = useCallback(
    (trigger: ContextMenuTrigger, entries: ContextMenuEntry[]) => {
      // Nothing actionable here — let the event bubble so a parent's menu can
      // handle it (and the global listener still suppresses the browser menu).
      if (entries.length === 0) return;
      trigger.preventDefault();
      // Stop bubbling so a nested target's menu wins over an ancestor's.
      trigger.stopPropagation();
      setMenu({ x: trigger.clientX, y: trigger.clientY, entries });
    },
    [],
  );

  const close = useCallback(() => setMenu(null), []);

  const service = useMemo<ContextMenuService>(
    () => ({ open, close }),
    [open, close],
  );

  // Suppress the native browser context menu app-wide, except within editable
  // text fields (inputs/textareas/selects and contenteditable regions).
  useEffect(() => {
    function onNativeContextMenu(event: MouseEvent) {
      const target = event.target as
        | (HTMLElement & { closest?: (s: string) => Element | null })
        | null;
      const editable =
        isEditableTarget(target) ||
        !!target?.closest?.(
          "input, textarea, select, [contenteditable='true'], [contenteditable='']",
        );
      if (editable) return; // allow the native menu (copy/paste/select)
      event.preventDefault();
    }
    document.addEventListener("contextmenu", onNativeContextMenu);
    return () =>
      document.removeEventListener("contextmenu", onNativeContextMenu);
  }, []);

  return (
    <ContextMenuContext.Provider value={service}>
      {children}
      {menu ? (
        <ContextMenuSurface
          x={menu.x}
          y={menu.y}
          entries={menu.entries}
          onClose={close}
        />
      ) : null}
    </ContextMenuContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContextMenu(): ContextMenuService {
  const service = useContext(ContextMenuContext);
  if (!service) {
    throw new Error(
      "useContextMenu must be used within a ContextMenuProvider",
    );
  }
  return service;
}

const VIEWPORT_PADDING = 8;

/** The floating menu itself — positioned at the cursor, clamped to the viewport. */
function ContextMenuSurface({
  x,
  y,
  entries,
  onClose,
}: {
  x: number;
  y: number;
  entries: ContextMenuEntry[];
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });

  // Clamp so the menu never spills outside the window.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width + VIEWPORT_PADDING > window.innerWidth) {
      nx = Math.max(VIEWPORT_PADDING, window.innerWidth - rect.width - VIEWPORT_PADDING);
    }
    if (y + rect.height + VIEWPORT_PADDING > window.innerHeight) {
      ny = Math.max(VIEWPORT_PADDING, window.innerHeight - rect.height - VIEWPORT_PADDING);
    }
    setPos({ x: nx, y: ny });
  }, [x, y, entries]);

  // Focus the first enabled item so the menu is keyboard-operable immediately.
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    );
    first?.focus();
  }, []);

  // Close on outside pointer, Escape, scroll, and resize.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(menuRef.current, event.key === "ArrowDown" ? 1 : -1);
      }
    }
    function onScrollOrResize() {
      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className="fixed z-[60] min-w-[12rem] max-w-[18rem] overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      {entries.map((entry, index) =>
        isSeparator(entry) ? (
          <div
            key={`sep-${index}`}
            role="separator"
            className="my-1 h-px bg-border"
          />
        ) : (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            disabled={entry.disabled}
            onClick={() => {
              if (entry.disabled) return;
              onClose();
              entry.onSelect?.();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm outline-none",
              "focus-visible:bg-accent focus-visible:text-accent-foreground",
              entry.disabled
                ? "cursor-not-allowed text-muted-foreground/60"
                : entry.danger
                  ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                  : "text-popover-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            )}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
              {entry.checked ? (
                <Check className="h-4 w-4" />
              ) : entry.icon ? (
                <entry.icon className="h-4 w-4" />
              ) : null}
            </span>
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.shortcut ? (
              <span className="ml-auto pl-4 text-xs tabular-nums text-muted-foreground">
                {entry.shortcut}
              </span>
            ) : null}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

/** Move keyboard focus to the next/previous enabled menu item, wrapping around. */
function moveFocus(menu: HTMLDivElement | null, delta: number) {
  if (!menu) return;
  const items = Array.from(
    menu.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    ),
  );
  if (items.length === 0) return;
  const active = document.activeElement as HTMLElement | null;
  const current = items.findIndex((item) => item === active);
  const next = (current + delta + items.length) % items.length;
  items[next]?.focus();
}
