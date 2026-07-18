import { cn } from "@/shared/lib/utils";

/**
 * A slim vertical drag bar between two panels (VS Code style). Sits on a panel's
 * edge; dragging it resizes the adjacent panel via {@link useResizablePanel}. It's
 * a focusable separator, so the width can also be nudged with the arrow keys.
 */
export function ResizeHandle({
  onPointerDown,
  onKeyDown,
  ariaLabel,
  className,
}: {
  onPointerDown: (event: React.PointerEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      {...(onKeyDown ? { onKeyDown } : {})}
      className={cn(
        "relative z-10 w-1 shrink-0 cursor-col-resize touch-none bg-transparent transition-colors",
        "hover:bg-primary/30 focus-visible:bg-primary/40 focus-visible:outline-none",
        className,
      )}
    />
  );
}
