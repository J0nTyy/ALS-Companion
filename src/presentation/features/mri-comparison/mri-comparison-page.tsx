import { useEffect, useState } from "react";
import { Maximize, RotateCcw } from "lucide-react";

import { crossLinkedIds, partnersOf } from "@/domain/entities/annotation-link";
import { Button } from "@/presentation/components/ui/button";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildComparisonContextMenu } from "@/presentation/features/context-menu/menus";
import { isSyncBoth, shortcutAction } from "./comparison-state";
import { resolveSelection } from "./comparison-selection";
import { SessionPicker } from "./components/session-picker";
import { ComparisonPane } from "./components/comparison-pane";
import { useComparableSessions } from "./use-comparable-sessions";
import { useComparisonViewers } from "./use-comparison-viewers";
import { useComparisonAnnotations } from "./use-comparison-annotations";

/**
 * The MRI Comparison workspace — the first researcher-facing imaging workflow
 * built on the existing imaging stack (MRI Session → Research Asset → Stored File
 * → Viewer). Pick two sessions with attached PNG/JPEG images and view them
 * side-by-side, optionally synchronizing zoom/pan. Introduces no new persistence.
 * Out of scope: overlays, difference maps, measurements, ROI, annotations, DICOM.
 */
export function MriComparisonPage() {
  const { state: sessionsState, reload } = useComparableSessions();
  const { state, dispatch, leftController, rightController } =
    useComparisonViewers();
  const contextMenu = useContextMenu();

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);

  const sessions =
    sessionsState.status === "ready" ? sessionsState.sessions : [];
  const selection = resolveSelection(sessions, leftId, rightId);

  const leftFileId = selection.left?.image.storedFileId ?? null;
  const rightFileId = selection.right?.image.storedFileId ?? null;
  const {
    left: leftAnnotations,
    right: rightAnnotations,
    links,
  } = useComparisonAnnotations(leftFileId, rightFileId);

  // A different pair (or side) clears any stale cross-highlight selection.
  useEffect(() => {
    setSelectedAnnotationId(null);
  }, [leftFileId, rightFileId]);

  const leftIds = new Set(leftAnnotations.map((a) => a.id));
  const rightIds = new Set(rightAnnotations.map((a) => a.id));
  const crossLinked = crossLinkedIds(links, leftIds, rightIds);
  const partners = selectedAnnotationId
    ? new Set(partnersOf(links, selectedAnnotationId))
    : new Set<string>();
  const filterToPane = (ids: Iterable<string>, paneIds: Set<string>) =>
    [...ids].filter((id) => paneIds.has(id));

  // Keyboard shortcuts: R reset both, F fit both, Z sync zoom, P sync pan.
  // Ignored while a form control is focused (so native type-ahead still works).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const action = shortcutAction(event.key);
      if (action) {
        event.preventDefault();
        dispatch(action);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          MRI Comparison
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare two MRI sessions side-by-side. Synchronize zoom and pan to move
          them together.
        </p>
      </div>

      {sessionsState.status === "unavailable" ? (
        <Message>
          The MRI comparison workspace is available in the installed desktop app.
        </Message>
      ) : null}

      {sessionsState.status === "loading" ? (
        <Message>Loading MRI sessions…</Message>
      ) : null}

      {sessionsState.status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{sessionsState.message}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      ) : null}

      {sessionsState.status === "ready" ? (
        sessions.length < 2 ? (
          <Message>
            You need at least two MRI sessions with an attached PNG or JPEG image
            to compare. Attach images to your MRI sessions' research assets first
            (TIFF isn't viewable in-app yet, so it can't be compared).
          </Message>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SessionPicker
                label="Left session"
                sessions={sessions}
                value={leftId}
                onChange={setLeftId}
              />
              <SessionPicker
                label="Right session"
                sessions={sessions}
                value={rightId}
                onChange={setRightId}
              />
            </div>

            {selection.sameSession ? (
              <p className="text-xs text-muted-foreground">
                Both sides show the same session.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-card/50 px-4 py-3">
              <span className="text-sm font-medium text-foreground">
                Synchronize
              </span>
              <SyncToggle
                label="Zoom"
                checked={state.sync.zoom}
                onChange={() => dispatch({ type: "toggleSyncZoom" })}
              />
              <SyncToggle
                label="Pan"
                checked={state.sync.pan}
                onChange={() => dispatch({ type: "toggleSyncPan" })}
              />
              <SyncToggle
                label="Both"
                checked={isSyncBoth(state.sync)}
                onChange={() =>
                  dispatch({
                    type: "setSyncBoth",
                    on: !isSyncBoth(state.sync),
                  })
                }
              />

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch({ type: "fitBoth" })}
                >
                  <Maximize />
                  Fit both
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch({ type: "resetBoth" })}
                >
                  <RotateCcw />
                  Reset both
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Shortcuts: <Kbd>R</Kbd> reset both · <Kbd>F</Kbd> fit both ·{" "}
              <Kbd>Z</Kbd> sync zoom · <Kbd>P</Kbd> sync pan
            </p>

            {crossLinked.size > 0 ? (
              <p className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-muted-foreground">
                Annotations linked across these two sessions are outlined in
                amber. Select one to highlight its linked partner in the other
                panel.
              </p>
            ) : null}

            <div
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
              onContextMenu={(e) =>
                contextMenu.open(
                  e,
                  buildComparisonContextMenu({
                    onFitBoth: () => dispatch({ type: "fitBoth" }),
                    onResetBoth: () => dispatch({ type: "resetBoth" }),
                    onToggleSyncZoom: () => dispatch({ type: "toggleSyncZoom" }),
                    onToggleSyncPan: () => dispatch({ type: "toggleSyncPan" }),
                    syncZoom: state.sync.zoom,
                    syncPan: state.sync.pan,
                  }),
                )
              }
            >
              <ComparisonPane
                label="Left"
                session={selection.left}
                controller={leftController}
                annotations={leftAnnotations}
                selectedId={
                  selectedAnnotationId && leftIds.has(selectedAnnotationId)
                    ? selectedAnnotationId
                    : null
                }
                highlightedIds={filterToPane(partners, leftIds)}
                linkedIds={filterToPane(crossLinked, leftIds)}
                onSelectAnnotation={setSelectedAnnotationId}
              />
              <ComparisonPane
                label="Right"
                session={selection.right}
                controller={rightController}
                annotations={rightAnnotations}
                selectedId={
                  selectedAnnotationId && rightIds.has(selectedAnnotationId)
                    ? selectedAnnotationId
                    : null
                }
                highlightedIds={filterToPane(partners, rightIds)}
                linkedIds={filterToPane(crossLinked, rightIds)}
                onSelectAnnotation={setSelectedAnnotationId}
              />
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

function SyncToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
      {label}
    </label>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium text-foreground">
      {children}
    </kbd>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
