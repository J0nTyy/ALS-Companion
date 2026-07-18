import { useCallback, useRef, useState } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface ResizablePanel {
  /** Current width in px. */
  width: number;
  /** Wire to a ResizeHandle's `onPointerDown` to begin an edge drag. */
  onPointerDown: (event: React.PointerEvent) => void;
  /** Wire to a ResizeHandle's `onKeyDown` for arrow-key resizing (accessibility). */
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * A fixed-px panel whose width can be changed by dragging an edge handle (or nudged
 * with the arrow keys when the handle is focused), remembered in localStorage.
 *
 * `grow` says which drag direction widens the panel: `"rightward"` for a left
 * sidebar (handle on its right edge — drag right to widen), `"leftward"` for a right
 * dock (handle on its left edge — drag left to widen).
 */
export function useResizablePanel(options: {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
  grow: "rightward" | "leftward";
}): ResizablePanel {
  const { storageKey, defaultWidth, min, max, grow } = options;

  const [width, setWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw === null ? NaN : Number(raw);
      return Number.isFinite(parsed) ? clamp(parsed, min, max) : defaultWidth;
    } catch {
      return defaultWidth;
    }
  });

  // Kept in sync so the pointer/keyboard handlers always read the latest width
  // without needing to be recreated on every change.
  const widthRef = useRef(width);
  widthRef.current = width;

  const persist = useCallback(
    (value: number) => {
      try {
        localStorage.setItem(storageKey, String(value));
      } catch {
        // Remembering the width is best-effort; the app works without it.
      }
    },
    [storageKey],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = widthRef.current;
      const previousUserSelect = document.body.style.userSelect;
      const previousCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const next = grow === "rightward" ? startWidth + delta : startWidth - delta;
        setWidth(clamp(next, min, max));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = previousUserSelect;
        document.body.style.cursor = previousCursor;
        persist(widthRef.current);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [grow, min, max, persist],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const step = event.shiftKey ? 48 : 16;
      const sign = grow === "rightward" ? 1 : -1;
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const next = clamp(widthRef.current + direction * sign * step, min, max);
      setWidth(next);
      persist(next);
    },
    [grow, min, max, persist],
  );

  return { width, onPointerDown, onKeyDown };
}
