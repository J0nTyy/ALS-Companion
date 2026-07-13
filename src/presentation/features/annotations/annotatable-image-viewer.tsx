import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import type {
  Annotation,
  AnnotationGeometry,
  RectangleGeometry,
} from "@/domain/entities/annotation";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useImageTransform } from "@/presentation/features/storage/use-image-transform";
import type { ImageViewerController } from "@/presentation/features/storage/image-transform";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import {
  buildAnnotationContextMenu,
  buildViewerContextMenu,
} from "@/presentation/features/context-menu/menus";
import {
  fitContainSize,
  normalizedFromPoint,
  percent,
  pointGeometryAt,
  rectangleFromCorners,
  resizeRectangle,
  translatePoint,
  translateRectangle,
  type RectHandle,
  type Size,
} from "./annotation-geometry";
import {
  shouldClearSelection,
  type AnnotationMode,
} from "./annotation-interaction";

export type { AnnotationMode } from "./annotation-interaction";

/** Below this normalized size a drag is treated as an accidental click, not a box. */
const MIN_RECT_SIZE = 0.01;
/** Pixels of pointer travel below which a press is treated as a click. */
const CLICK_SLOP = 4;
/** Zoom step per button press / wheel notch — kept small for fine, precise control. */
const BUTTON_ZOOM = 1.1;
const WHEEL_ZOOM = 1.05;

/** A move (whole shape) or resize (one rectangle corner) drag in progress. */
type DragState =
  | {
      kind: "move";
      id: string;
      startX: number;
      startY: number;
      startGeometry: AnnotationGeometry;
      moved: boolean;
    }
  | {
      kind: "resize";
      id: string;
      handle: RectHandle;
      startX: number;
      startY: number;
      startGeometry: RectangleGeometry;
      moved: boolean;
    };

const RESIZE_HANDLES: {
  handle: RectHandle;
  at: (g: RectangleGeometry) => { x: number; y: number };
  cursor: string;
}[] = [
  { handle: "nw", at: (g) => ({ x: g.x, y: g.y }), cursor: "nwse-resize" },
  { handle: "ne", at: (g) => ({ x: g.x + g.width, y: g.y }), cursor: "nesw-resize" },
  { handle: "sw", at: (g) => ({ x: g.x, y: g.y + g.height }), cursor: "nesw-resize" },
  {
    handle: "se",
    at: (g) => ({ x: g.x + g.width, y: g.y + g.height }),
    cursor: "nwse-resize",
  },
];

/**
 * An image viewer with zoom/pan (reusing the shared transform model) plus an
 * annotation overlay drawn *above* the image. Annotations live in normalized
 * image coordinates, so they track the image through zoom, pan, and resize.
 *
 * Zoom is a single **uniform** `transform: scale()` applied to the content box, so
 * the image can never stretch. In "select" mode a background drag pans (when
 * zoomed), clicking a mark selects it, clicking empty space clears the selection,
 * and — when editable — a mark can be **dragged to move** and a rectangle
 * **resized** by its corner handles. In "point"/"rectangle" mode the pointer draws
 * a new annotation. `fill` makes the viewer fill its container (for full-screen).
 */
export function AnnotatableImageViewer({
  src,
  alt,
  annotations,
  selectedId,
  mode,
  onSelect,
  onCreate,
  onSetMode,
  onEditAnnotation,
  onDeleteAnnotation,
  onNaturalSize,
  onDragPreview,
  onDragCommit,
  controller,
  highlightedIds,
  linkedIds,
  fill = false,
  showCoordinates = false,
  heightClass = "h-96",
}: {
  src: string;
  alt: string;
  annotations: readonly Annotation[];
  selectedId: string | null;
  mode: AnnotationMode;
  onSelect: (id: string | null) => void;
  onCreate: (geometry: AnnotationGeometry) => void;
  /** Switch the active tool (from the viewer's right-click background menu). */
  onSetMode?: (mode: AnnotationMode) => void;
  /** Edit a mark's label/notes (from its right-click menu) — selects + focuses. */
  onEditAnnotation?: (id: string, focus: "label" | "notes") => void;
  /** Delete a mark (from its right-click menu). */
  onDeleteAnnotation?: (id: string) => void;
  /** Reports the image's natural pixel size (null before load / on error). */
  onNaturalSize?: (size: Size | null) => void;
  /** Live geometry while a mark is being dragged/resized (before it's saved). */
  onDragPreview?: (id: string, geometry: AnnotationGeometry) => void;
  /** Final geometry to persist when a drag/resize ends. Its presence enables editing. */
  onDragCommit?: (id: string, geometry: AnnotationGeometry) => void;
  /** External transform controller (e.g. MRI comparison's synced viewers). */
  controller?: ImageViewerController;
  /** Marks to strongly highlight (a linked partner of the current selection). */
  highlightedIds?: readonly string[];
  /** Marks that have a cross-session link (persistent "linked" indicator). */
  linkedIds?: readonly string[];
  /** Fill the parent's height (full-screen) instead of using `heightClass`. */
  fill?: boolean;
  /** Show a live cursor-coordinate readout (for precision viewing). */
  showCoordinates?: boolean;
  heightClass?: string;
}) {
  const contextMenu = useContextMenu();
  const internal = useImageTransform();
  const view = controller ?? internal;
  const onNaturalSizeRef = useRef(onNaturalSize);
  onNaturalSizeRef.current = onNaturalSize;
  const viewRef = useRef(view);
  viewRef.current = view;
  const { scale, offset } = view.transform;

  const editable = Boolean(onDragCommit);

  const [broken, setBroken] = useState(false);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [natural, setNatural] = useState<Size | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Scratch state for background pan / draw / mark drag (refs: always current).
  const pressRef = useRef<{
    startClientX: number;
    startClientY: number;
    moved: boolean;
  } | null>(null);
  const panLast = useRef<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<AnnotationGeometry | null>(null);
  const draftStart = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // A new source is a different image — reset load state and report unknown size.
  useEffect(() => {
    setBroken(false);
    setNatural(null);
    onNaturalSizeRef.current?.(null);
  }, [src]);

  // Measure the viewport so we can size the image's content box precisely.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () =>
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Wheel-to-zoom, attached natively so we can preventDefault. Small step for
  // fine control.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      viewRef.current.zoomBy(event.deltaY < 0 ? WHEEL_ZOOM : 1 / WHEEL_ZOOM);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fit = natural ? fitContainSize(viewport, natural) : { width: 0, height: 0 };
  const ready = natural !== null && fit.width > 0 && fit.height > 0;

  function overlayRect() {
    return overlayRef.current?.getBoundingClientRect() ?? null;
  }

  // --- background pointer (pan / draw / deselect) ---
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (broken || !ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
    if (mode === "select") {
      if (viewRef.current.transform.scale > 1) {
        panLast.current = { x: event.clientX, y: event.clientY };
      }
      return;
    }
    if (mode === "rectangle") {
      const rect = overlayRect();
      if (!rect) return;
      const start = normalizedFromPoint(rect, event.clientX, event.clientY);
      draftStart.current = start;
      setDraftRect(rectangleFromCorners(start, start));
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    if (press) {
      if (
        Math.abs(event.clientX - press.startClientX) > CLICK_SLOP ||
        Math.abs(event.clientY - press.startClientY) > CLICK_SLOP
      ) {
        press.moved = true;
      }
    }

    if (mode === "select" && panLast.current) {
      viewRef.current.panBy(
        event.clientX - panLast.current.x,
        event.clientY - panLast.current.y,
      );
      panLast.current = { x: event.clientX, y: event.clientY };
      return;
    }

    if (mode === "rectangle" && draftStart.current) {
      const rect = overlayRect();
      if (!rect) return;
      const current = normalizedFromPoint(rect, event.clientX, event.clientY);
      setDraftRect(rectangleFromCorners(draftStart.current, current));
      return;
    }

    // Idle hover → live coordinate readout (precision viewing).
    if (
      showCoordinates &&
      !dragRef.current &&
      !panLast.current &&
      !draftStart.current
    ) {
      const rect = overlayRect();
      if (rect) setHover(normalizedFromPoint(rect, event.clientX, event.clientY));
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    pressRef.current = null;
    panLast.current = null;

    if (broken || !ready) {
      draftStart.current = null;
      setDraftRect(null);
      return;
    }

    if (mode === "select") {
      if (shouldClearSelection(mode, press)) onSelect(null);
      return;
    }

    const rect = overlayRect();
    if (mode === "point" && rect) {
      const p = normalizedFromPoint(rect, event.clientX, event.clientY);
      onCreate(pointGeometryAt(p.x, p.y));
      return;
    }

    if (mode === "rectangle") {
      const draft = draftRect;
      draftStart.current = null;
      setDraftRect(null);
      if (
        draft &&
        draft.kind === "rectangle" &&
        draft.width >= MIN_RECT_SIZE &&
        draft.height >= MIN_RECT_SIZE
      ) {
        onCreate(draft);
      }
    }
  }

  // --- mark / handle drag (move + resize) ---
  function geometryFromDrag(
    drag: DragState,
    event: ReactPointerEvent<HTMLElement>,
  ): AnnotationGeometry | null {
    const rect = overlayRect();
    if (!rect) return null;
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;
    if (drag.kind === "move") {
      return drag.startGeometry.kind === "point"
        ? translatePoint(drag.startGeometry, dx, dy)
        : translateRectangle(drag.startGeometry, dx, dy);
    }
    return resizeRectangle(drag.startGeometry, drag.handle, dx, dy);
  }

  function beginMarkDrag(
    annotation: Annotation,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (mode !== "select") return;
    event.stopPropagation();
    onSelect(annotation.id);
    if (!editable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      kind: "move",
      id: annotation.id,
      startX: event.clientX,
      startY: event.clientY,
      startGeometry: annotation.geometry,
      moved: false,
    };
  }

  function beginResize(
    id: string,
    geometry: RectangleGeometry,
    handle: RectHandle,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    event.stopPropagation();
    if (!editable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      kind: "resize",
      id,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startGeometry: geometry,
      moved: false,
    };
  }

  function onDragMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (
      Math.abs(event.clientX - drag.startX) > CLICK_SLOP ||
      Math.abs(event.clientY - drag.startY) > CLICK_SLOP
    ) {
      drag.moved = true;
    }
    const geometry = geometryFromDrag(drag, event);
    if (geometry) onDragPreview?.(drag.id, geometry);
  }

  function onDragEnd(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.moved) return; // a click, not a drag (selection handled)
    const geometry = geometryFromDrag(drag, event);
    if (geometry) onDragCommit?.(drag.id, geometry);
  }

  function openBackgroundMenu(event: ReactMouseEvent<HTMLDivElement>) {
    contextMenu.open(
      event,
      buildViewerContextMenu({
        onFit: () => view.fit(),
        onReset: () => view.reset(),
        onCenter: () =>
          view.panBy(-view.transform.offset.x, -view.transform.offset.y),
        ...(onSetMode
          ? {
              onAddPoint: () => onSetMode("point"),
              onAddRectangle: () => onSetMode("rectangle"),
            }
          : {}),
      }),
    );
  }

  function openMarkMenu(id: string, event: ReactMouseEvent<HTMLElement>) {
    onSelect(id);
    contextMenu.open(
      event,
      buildAnnotationContextMenu({
        ...(onEditAnnotation
          ? {
              onEditLabel: () => onEditAnnotation(id, "label"),
              onEditNotes: () => onEditAnnotation(id, "notes"),
            }
          : {}),
        ...(onDeleteAnnotation ? { onDelete: () => onDeleteAnnotation(id) } : {}),
      }),
    );
  }

  const cursor =
    mode === "select" ? (scale > 1 ? "grab" : "default") : "crosshair";
  const markersInteractive = mode === "select";

  const selectedRectangle =
    editable && mode === "select"
      ? annotations.find(
          (a) => a.id === selectedId && a.geometry.kind === "rectangle",
        )
      : undefined;
  const selectedRectGeometry =
    selectedRectangle && selectedRectangle.geometry.kind === "rectangle"
      ? selectedRectangle.geometry
      : null;

  const coordinateReadout = hover
    ? natural
      ? `x ${hover.x.toFixed(3)} (${Math.round(hover.x * natural.width)}px) · y ${hover.y.toFixed(3)} (${Math.round(hover.y * natural.height)}px)`
      : `x ${hover.x.toFixed(3)} · y ${hover.y.toFixed(3)}`
    : "Move over the image to read coordinates";

  return (
    <div className={fill ? "flex h-full min-h-0 flex-col gap-2" : "space-y-2"}>
      <div className="flex shrink-0 items-center gap-1">
        <ViewerButton label="Zoom in" onClick={() => view.zoomBy(BUTTON_ZOOM)}>
          <ZoomIn />
        </ViewerButton>
        <ViewerButton
          label="Zoom out"
          onClick={() => view.zoomBy(1 / BUTTON_ZOOM)}
        >
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
        {showCoordinates ? (
          <span className="ml-auto truncate pl-2 text-xs tabular-nums text-muted-foreground">
            {coordinateReadout}
          </span>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 select-none",
          fill ? "min-h-0 flex-1" : heightClass,
        )}
      >
        {broken ? (
          <p className="px-4 text-center text-sm text-muted-foreground">
            This image couldn't be loaded. The file may have been moved or
            removed.
          </p>
        ) : (
          <div
            className="relative shrink-0"
            style={{
              width: ready ? fit.width : undefined,
              height: ready ? fit.height : undefined,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center",
            }}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              onLoad={(e) => {
                const size = {
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                };
                setNatural(size);
                onNaturalSizeRef.current?.(size);
              }}
              onError={() => {
                setBroken(true);
                onNaturalSizeRef.current?.(null);
              }}
              className={cn(
                "block select-none object-contain",
                ready ? "h-full w-full" : "max-h-96 max-w-full",
              )}
            />

            {ready ? (
              <div
                ref={overlayRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={() => setHover(null)}
                onContextMenu={openBackgroundMenu}
                className="absolute inset-0"
                style={{ cursor, touchAction: "none" }}
              >
                {annotations.map((annotation) => (
                  <AnnotationMark
                    key={annotation.id}
                    annotation={annotation}
                    selected={annotation.id === selectedId}
                    highlighted={highlightedIds?.includes(annotation.id) ?? false}
                    linked={linkedIds?.includes(annotation.id) ?? false}
                    interactive={markersInteractive}
                    draggable={markersInteractive && editable}
                    onPointerDown={(e) => beginMarkDrag(annotation, e)}
                    onPointerMove={onDragMove}
                    onPointerUp={onDragEnd}
                    onContextMenu={(e) => openMarkMenu(annotation.id, e)}
                  />
                ))}

                {selectedRectGeometry
                  ? RESIZE_HANDLES.map(({ handle, at, cursor: handleCursor }) => {
                      const pos = at(selectedRectGeometry);
                      return (
                        <button
                          key={handle}
                          type="button"
                          aria-label={`Resize ${handle}`}
                          onPointerDown={(e) =>
                            beginResize(
                              selectedRectangle!.id,
                              selectedRectGeometry,
                              handle,
                              e,
                            )
                          }
                          onPointerMove={onDragMove}
                          onPointerUp={onDragEnd}
                          className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-primary shadow"
                          style={{
                            left: percent(pos.x),
                            top: percent(pos.y),
                            cursor: handleCursor,
                          }}
                        />
                      );
                    })
                  : null}

                {draftRect && draftRect.kind === "rectangle" ? (
                  <div
                    className="pointer-events-none absolute rounded-sm border-2 border-dashed border-primary bg-primary/10"
                    style={{
                      left: percent(draftRect.x),
                      top: percent(draftRect.y),
                      width: percent(draftRect.width),
                      height: percent(draftRect.height),
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** One annotation drawn over the image. Selected marks are clearly distinguished. */
function AnnotationMark({
  annotation,
  selected,
  highlighted = false,
  linked = false,
  interactive,
  draggable,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
}: {
  annotation: Annotation;
  selected: boolean;
  highlighted?: boolean;
  linked?: boolean;
  interactive: boolean;
  draggable: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
}) {
  const { geometry } = annotation;
  const pointerClass = interactive
    ? draggable
      ? "pointer-events-auto cursor-move"
      : "pointer-events-auto cursor-pointer"
    : "pointer-events-none";
  // Emphasis ring: selection wins, then a highlighted linked-partner, then a
  // persistent "linked across sessions" indicator (amber).
  const emphasis = selected
    ? "ring-2 ring-primary/60"
    : highlighted
      ? "ring-2 ring-amber-500"
      : linked
        ? "ring-2 ring-amber-400/70"
        : "";
  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu,
  };

  if (geometry.kind === "point") {
    return (
      <button
        type="button"
        aria-label={`Annotation${annotation.label ? `: ${annotation.label}` : ""}`}
        aria-pressed={selected}
        {...handlers}
        className={cn(
          "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-all",
          pointerClass,
          selected ? "h-4 w-4 bg-primary" : "h-3.5 w-3.5 bg-primary/70",
          !selected && interactive
            ? "hover:h-4 hover:w-4 hover:bg-primary hover:ring-2 hover:ring-primary/40"
            : "",
          emphasis,
        )}
        style={{ left: percent(geometry.x), top: percent(geometry.y) }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Annotation${annotation.label ? `: ${annotation.label}` : ""}`}
      aria-pressed={selected}
      {...handlers}
      className={cn(
        "absolute rounded-sm border-2 bg-transparent transition-colors",
        pointerClass,
        selected
          ? "border-primary bg-primary/10"
          : "border-primary/70 hover:border-primary hover:bg-primary/5",
        emphasis,
      )}
      style={{
        left: percent(geometry.x),
        top: percent(geometry.y),
        width: percent(geometry.width),
        height: percent(geometry.height),
      }}
    />
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
