import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/**
 * An accessible modal dialog: rendered in a portal on <body>, it traps focus
 * (Tab / Shift+Tab cycle within it), restores focus to the previously-focused
 * element on close, closes on Escape, and marks the rest of the app `inert` +
 * `aria-hidden` so keyboard and screen-reader focus can't escape behind it.
 *
 * The caller owns open/close state and renders the dialog's contents; this
 * component supplies the overlay, the labelled `role="dialog" aria-modal` surface,
 * and all the focus behaviour.
 */
export function Modal({
  open,
  onClose,
  labelledById,
  describedById,
  children,
  closeOnOverlayClick = true,
}: {
  open: boolean;
  onClose: () => void;
  labelledById?: string;
  describedById?: string;
  children: ReactNode;
  closeOnOverlayClick?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus management + background inert while open.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Everything outside the dialog becomes inert to keyboard + AT.
    const roots = Array.from(document.body.children).filter(
      (el) => el.getAttribute("data-modal-portal") === null,
    ) as HTMLElement[];
    for (const el of roots) {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
    }

    // Focus the first focusable element (or the dialog itself).
    const container = dialogRef.current;
    const first = container ? focusable(container)[0] : null;
    (first ?? container)?.focus();

    return () => {
      for (const el of roots) {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      }
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== "Tab") return;
    const container = dialogRef.current;
    if (!container) return;
    const items = focusable(container);
    if (items.length === 0) {
      e.preventDefault();
      container.focus();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === container)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!open) return null;

  return createPortal(
    <div
      data-modal-portal=""
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        {...(labelledById ? { "aria-labelledby": labelledById } : {})}
        {...(describedById ? { "aria-describedby": describedById } : {})}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-5 shadow-xl outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
