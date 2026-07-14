import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Dot, Maximize2, Minimize2, MousePointer2, Square } from "lucide-react";

import type {
  Annotation,
  AnnotationGeometry,
} from "@/domain/entities/annotation";
import { ANNOTATION_TYPE_META } from "@/domain/entities/annotation";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Label } from "@/presentation/components/ui/label";
import {
  ConfirmDeleteButton,
  type ConfirmDeleteHandle,
} from "@/presentation/components/confirm-delete-button";
import type { ImageDimensions } from "@/domain/measurements/measurement-engine";
import { toUserMessage } from "@/presentation/lib/error-message";
import {
  AnnotatableImageViewer,
  type AnnotationMode,
} from "./annotatable-image-viewer";
import type { AnnotatedContext } from "@/application/ports/annotation-context-reader";
import { LinkedAnnotationsPanel } from "@/presentation/features/annotation-links/linked-annotations-panel";
import { animalRouteForContext } from "@/presentation/features/annotation-links/annotation-link-navigation";
import { resolveSelected } from "./annotation-geometry";
import { RoiInspector } from "./roi-inspector";
import { useAnnotations } from "./use-annotations";
import { useAnnotationService } from "./annotation-service-context";
import { useSettings } from "@/shared/hooks/use-settings";

/**
 * The annotation workspace shown inside the image viewer for one stored image.
 * Provides simple tools (add point / add rectangle), selection, and label/notes
 * editing + delete of the selected mark. Annotations render above the image and
 * are the persistent foundation for future measurement / ROI / AI layers.
 *
 * When the study is archived (`readOnly`) the tools and editing are hidden — marks
 * stay viewable and the application layer also refuses writes (defense in depth).
 */
export function AnnotationWorkspace({
  storedFileId,
  src,
  alt,
  readOnly,
}: {
  storedFileId: string;
  src: string;
  alt: string;
  readOnly: boolean;
}) {
  const service = useAnnotationService();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { state, reload } = useAnnotations(storedFileId);
  const [mode, setMode] = useState<AnnotationMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editFocus, setEditFocus] = useState<{
    field: "label" | "notes";
    nonce: number;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Live geometry while a mark is being dragged/resized (before it's persisted),
  // so both the viewer and the ROI inspector update instantly during the drag.
  const [preview, setPreview] = useState<{
    id: string;
    geometry: AnnotationGeometry;
  } | null>(null);
  // The loaded image's natural pixel size (from the viewer). Drives pixel
  // measurements in the ROI inspector; null until the image loads.
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(
    null,
  );

  const annotations = state.status === "ready" ? state.annotations : [];
  const selected = resolveSelected(annotations, selectedId);

  // Live mirrors (read from stale menu-item closures without going stale).
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const focusNonce = useRef(0);
  // The selected mark's confirm dialog + a pending request to open it.
  const confirmHandleRef = useRef<ConfirmDeleteHandle | null>(null);
  const pendingDeleteRef = useRef(false);

  // Plain selection (left-click / clicking a mark) clears any pending focus.
  const handleSelect = useCallback((id: string | null) => {
    setEditFocus(null);
    setSelectedId(id);
  }, []);

  // Switching tools clears the selection (an intentional clear).
  const selectTool = useCallback((next: AnnotationMode) => {
    setEditFocus(null);
    setSelectedId(null);
    setMode(next);
  }, []);

  // From a mark's right-click "Edit label"/"Edit notes": select + focus the field.
  const handleEditAnnotation = useCallback(
    (id: string, field: "label" | "notes") => {
      setSelectedId(id);
      setEditFocus({ field, nonce: ++focusNonce.current });
    },
    [],
  );

  // From a mark's right-click "Delete": open the same confirm dialog the editor
  // renders. If the mark's editor is already mounted, open now; otherwise select
  // it and let `registerConfirm` open the dialog when the editor mounts.
  const requestDeleteAnnotation = useCallback((id: string) => {
    if (selectedIdRef.current === id && confirmHandleRef.current) {
      confirmHandleRef.current.open();
    } else {
      pendingDeleteRef.current = true;
      setSelectedId(id);
    }
  }, []);

  const registerConfirm = useCallback((handle: ConfirmDeleteHandle | null) => {
    // Only track real handles; ignore the transient null on unmount. This keeps the
    // latest mounted editor's handle even when it remounts into a different tree
    // (e.g. toggling full screen), regardless of ref cleanup/setup ordering.
    if (!handle) return;
    confirmHandleRef.current = handle;
    if (pendingDeleteRef.current) {
      pendingDeleteRef.current = false;
      handle.open();
    }
  }, []);

  // Escape exits full screen — unless a dialog/menu is open (it handles Esc first).
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // Live preview while dragging/resizing a mark; persist the final geometry on drop.
  const handleDragPreview = useCallback(
    (id: string, geometry: AnnotationGeometry) => setPreview({ id, geometry }),
    [],
  );

  async function handleDragCommit(id: string, geometry: AnnotationGeometry) {
    const target = annotations.find((a) => a.id === id);
    setActionError(null);
    try {
      if (target) {
        await service.update({
          id,
          annotationType: geometry.kind,
          geometry,
          // Preserve the existing label/notes (a bare update would clear them).
          ...(target.label !== undefined ? { label: target.label } : {}),
          ...(target.notes !== undefined ? { notes: target.notes } : {}),
        });
        await reload({ silent: true });
      }
    } catch (error) {
      setActionError(
        toUserMessage(error, "We couldn't move that annotation. Please try again."),
      );
    } finally {
      setPreview(null);
    }
  }

  async function handleCreate(geometry: AnnotationGeometry) {
    setActionError(null);
    try {
      const created = await service.create({
        storedFileId,
        annotationType: geometry.kind,
        geometry,
      });
      await reload({ silent: true });
      setMode("select");
      setSelectedId(created.id);
    } catch (error) {
      setActionError(
        toUserMessage(error, "We couldn't add that annotation. Please try again."),
      );
    }
  }

  async function handleSaveDetails(
    annotation: Annotation,
    label: string,
    notes: string,
  ) {
    await service.update({
      id: annotation.id,
      annotationType: annotation.annotationType,
      geometry: annotation.geometry,
      label,
      notes,
    });
    // Silent so the viewer/selection don't flash while the list refreshes.
    await reload({ silent: true });
  }

  async function handleDelete(annotation: Annotation) {
    await service.delete(annotation.id);
    setSelectedId(null);
    await reload({ silent: true });
  }

  // Apply the live drag/resize preview to what the viewer + inspector see.
  const displayAnnotations = preview
    ? annotations.map((a) =>
        a.id === preview.id
          ? { ...a, annotationType: preview.geometry.kind, geometry: preview.geometry }
          : a,
      )
    : annotations;
  const selectedForInspector =
    selected && preview && preview.id === selected.id
      ? { ...selected, annotationType: preview.geometry.kind, geometry: preview.geometry }
      : selected;

  const tool = (
    value: AnnotationMode,
    label: string,
    icon: React.ReactNode,
  ) => (
    <Button
      type="button"
      variant={mode === value ? "default" : "outline"}
      size="sm"
      onClick={() => selectTool(value)}
      aria-pressed={mode === value}
    >
      {icon}
      {label}
    </Button>
  );

  const toolButtons = readOnly ? null : (
    <div className="flex items-center gap-1">
      {tool("select", "Select", <MousePointer2 />)}
      {tool("point", "Add point", <Dot />)}
      {tool("rectangle", "Add rectangle", <Square />)}
    </div>
  );

  const renderViewer = (isFullscreen: boolean) => (
    <AnnotatableImageViewer
      src={src}
      alt={alt}
      annotations={displayAnnotations}
      selectedId={selectedId}
      mode={readOnly ? "select" : mode}
      onSelect={handleSelect}
      onCreate={(geometry) => void handleCreate(geometry)}
      onNaturalSize={setImageDimensions}
      fill={isFullscreen}
      showCoordinates={isFullscreen}
      {...(isFullscreen ? {} : { heightClass: "h-[32rem]" })}
      {...(readOnly
        ? {}
        : {
            onSetMode: selectTool,
            onEditAnnotation: handleEditAnnotation,
            onDeleteAnnotation: requestDeleteAnnotation,
            onDragPreview: handleDragPreview,
            onDragCommit: (id, geometry) => void handleDragCommit(id, geometry),
          })}
    />
  );

  const renderControls = () => (
    <>
      {!readOnly && mode !== "select" ? (
        <p className="text-xs text-muted-foreground">
          {mode === "point"
            ? "Click on the image to place a point."
            : "Click and drag on the image to draw a rectangle."}
        </p>
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive">{actionError}</p>
      ) : null}

      {selected ? (
        <SelectedAnnotationEditor
          key={selected.id}
          annotation={selected}
          readOnly={readOnly}
          onSave={handleSaveDetails}
          onDelete={handleDelete}
          confirmRef={registerConfirm}
          autoFocus={editFocus}
        />
      ) : null}

      {settings.showMeasurementPanel || selected ? (
        <RoiInspector
          annotation={selectedForInspector}
          imageDimensions={imageDimensions}
          hasAnnotations={annotations.length > 0}
          readOnly={readOnly}
        />
      ) : null}

      {selected ? (
        <LinkedAnnotationsPanel
          key={`links-${selected.id}`}
          annotationId={selected.id}
          readOnly={readOnly}
          onOpen={(context: AnnotatedContext) => {
            setFullscreen(false);
            navigate(animalRouteForContext(context));
          }}
        />
      ) : null}
    </>
  );

  const fullscreenButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setFullscreen(true)}
      disabled={state.status !== "ready"}
    >
      <Maximize2 />
      Full screen
    </Button>
  );

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          Annotations
          {annotations.length > 0 ? (
            <span className="ml-1 text-muted-foreground">
              ({annotations.length})
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {toolButtons}
          {fullscreenButton}
        </div>
      </div>

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Annotations are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading annotations…</p>
      ) : null}

      {state.status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === "ready" ? (
        fullscreen ? (
          <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            Viewing this image in full screen.{" "}
            <button
              type="button"
              className="font-medium text-primary underline underline-offset-2"
              onClick={() => setFullscreen(false)}
            >
              Exit full screen
            </button>{" "}
            (or press Esc).
          </p>
        ) : (
          <>
            {renderViewer(false)}
            {renderControls()}
          </>
        )
      ) : null}

      {fullscreen && state.status === "ready"
        ? createPortal(
            <div
              aria-label="Annotation full-screen viewer"
              className="fixed inset-0 z-50 flex flex-col bg-background"
            >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {alt}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Annotations
                    {annotations.length > 0 ? ` (${annotations.length})` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {toolButtons}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFullscreen(false)}
                  >
                    <Minimize2 />
                    Exit full screen
                  </Button>
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <section className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
                  {renderViewer(true)}
                </section>
                <aside className="w-full shrink-0 space-y-3 overflow-y-auto border-t border-border p-4 lg:w-96 lg:border-l lg:border-t-0">
                  {renderControls()}
                </aside>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * Editor for the selected annotation's label + notes, with delete. Re-mounted per
 * selection (keyed by id) so its inputs start from the selected mark's values.
 */
function SelectedAnnotationEditor({
  annotation,
  readOnly,
  onSave,
  onDelete,
  confirmRef,
  autoFocus,
}: {
  annotation: Annotation;
  readOnly: boolean;
  onSave: (
    annotation: Annotation,
    label: string,
    notes: string,
  ) => Promise<void>;
  onDelete: (annotation: Annotation) => Promise<void>;
  /** Callback ref to the delete confirm dialog, so a right-click can open it. */
  confirmRef: (handle: ConfirmDeleteHandle | null) => void;
  /** A request (from the mark's right-click menu) to focus a field. */
  autoFocus: { field: "label" | "notes"; nonce: number } | null;
}) {
  const [label, setLabel] = useState(annotation.label ?? "");
  const [notes, setNotes] = useState(annotation.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Focus the field requested via "Edit label" / "Edit notes".
  useEffect(() => {
    if (!autoFocus || readOnly) return;
    const el = autoFocus.field === "label" ? labelRef.current : notesRef.current;
    el?.focus();
  }, [autoFocus, readOnly]);

  const dirty =
    label !== (annotation.label ?? "") || notes !== (annotation.notes ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave(annotation, label, notes);
    } catch (e) {
      setError(
        toUserMessage(e, "We couldn't save this annotation. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {ANNOTATION_TYPE_META[annotation.annotationType].label} annotation
        </p>
        {readOnly ? null : (
          <ConfirmDeleteButton
            ref={confirmRef}
            iconOnly
            triggerAriaLabel="Delete annotation"
            title="Delete this annotation?"
            description="This permanently removes the selected mark from this image. This action cannot be undone."
            onConfirm={() => onDelete(annotation)}
          />
        )}
      </div>

      {readOnly ? (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Label
            </dt>
            <dd className="text-foreground">
              {annotation.label ?? <span className="italic text-muted-foreground">None</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </dt>
            <dd className="whitespace-pre-wrap text-foreground">
              {annotation.notes ?? (
                <span className="italic text-muted-foreground">None</span>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`ann-label-${annotation.id}`}>Label</Label>
            <Input
              ref={labelRef}
              id={`ann-label-${annotation.id}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Motor cortex lesion"
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`ann-notes-${annotation.id}`}>Notes</Label>
            <Textarea
              ref={notesRef}
              id={`ann-notes-${annotation.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional observations about this region."
              disabled={busy}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void save()}
              disabled={busy || !dirty}
            >
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
