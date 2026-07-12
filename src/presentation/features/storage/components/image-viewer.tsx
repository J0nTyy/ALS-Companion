import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { ImageViewerController } from "../image-transform";
import { useImageTransform } from "../use-image-transform";

/**
 * A single-image viewer with zoom, pan, fit-to-window, and reset. Pure DOM/CSS —
 * no image processing, comparison, annotations, or measurements. At scale 1 the
 * image is object-contained ("fit to window"); zoom/pan apply a CSS transform on
 * top and never alter the file.
 *
 * By default it owns its transform (uncontrolled — as used by the asset image
 * panel). Pass a `controller` to drive it externally: the MRI comparison workspace
 * supplies sync-aware controllers so two viewers move together, without this
 * component knowing anything about synchronization.
 */
export function ImageViewer({
  src,
  alt,
  controller,
  heightClass = "h-96",
}: {
  src: string;
  alt: string;
  controller?: ImageViewerController;
  heightClass?: string;
}) {
  const internal = useImageTransform();
  const view = controller ?? internal;
  // Keep the latest controller in a ref so the native wheel listener (attached
  // once) always calls current sync-aware logic.
  const viewRef = useRef(view);
  viewRef.current = view;

  const { scale, offset } = view.transform;
  const [broken, setBroken] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragLast = useRef<{ x: number; y: number } | null>(null);

  // A new source is a different image — clear any previous load error.
  useEffect(() => setBroken(false), [src]);

  // Wheel-to-zoom, attached natively so we can preventDefault (React's onWheel is
  // passive and can't).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      viewRef.current.zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (viewRef.current.transform.scale <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragLast.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const last = dragLast.current;
    if (!last) return;
    viewRef.current.panBy(event.clientX - last.x, event.clientY - last.y);
    dragLast.current = { x: event.clientX, y: event.clientY };
  }
  function endDrag() {
    dragLast.current = null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <ViewerButton label="Zoom in" onClick={() => view.zoomBy(1.25)}>
          <ZoomIn />
        </ViewerButton>
        <ViewerButton label="Zoom out" onClick={() => view.zoomBy(1 / 1.25)}>
          <ZoomOut />
        </ViewerButton>
        <ViewerButton label="Fit to window" onClick={() => view.fit()}>
          <Maximize />
        </ViewerButton>
        <ViewerButton label="Reset zoom" onClick={() => view.reset()}>
          <RotateCcw />
        </ViewerButton>
        <span className="ml-1 text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 select-none",
          heightClass,
        )}
        style={{ cursor: scale > 1 ? "grab" : "default", touchAction: "none" }}
      >
        {broken ? (
          <p className="px-4 text-center text-sm text-muted-foreground">
            This image couldn't be loaded. The file may have been moved or
            removed.
          </p>
        ) : (
          <img
            src={src}
            alt={alt}
            draggable={false}
            onError={() => setBroken(true)}
            className="max-h-full max-w-full object-contain"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          />
        )}
      </div>
    </div>
  );
}

function ViewerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
