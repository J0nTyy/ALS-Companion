import { useEffect, useMemo, useReducer } from "react";

import type { ImageViewerController } from "@/presentation/features/storage/image-transform";
import {
  comparisonReducer,
  INITIAL_COMPARISON_STATE,
  type ComparisonState,
  type SyncSettings,
} from "./comparison-state";

/**
 * Session-scoped memory of the last sync settings. A module-level value persists
 * while the app is open (across navigating away and back to the workspace) and is
 * naturally cleared when the app closes — matching "remember during the session".
 */
let rememberedSync: SyncSettings = { ...INITIAL_COMPARISON_STATE.sync };

/**
 * Owns the two viewers' transforms + sync settings and exposes sync-aware
 * controllers for the left/right {@link ImageViewer}. The viewers never know about
 * synchronization — the reducer mirrors zoom/pan to the other side when the
 * relevant sync is on. Reuses the single {@link comparisonReducer}, so there is no
 * duplicated viewer logic.
 */
export function useComparisonViewers() {
  const [state, dispatch] = useReducer(
    comparisonReducer,
    undefined,
    (): ComparisonState => ({
      ...INITIAL_COMPARISON_STATE,
      sync: { ...rememberedSync },
    }),
  );

  // Remember sync settings for the rest of the app session.
  useEffect(() => {
    rememberedSync = state.sync;
  }, [state.sync]);

  const leftController: ImageViewerController = useMemo(
    () => ({
      transform: state.left,
      zoomBy: (factor) => dispatch({ type: "zoom", side: "left", factor }),
      panBy: (dx, dy) => dispatch({ type: "pan", side: "left", dx, dy }),
      reset: () => dispatch({ type: "reset", side: "left" }),
      fit: () => dispatch({ type: "fit", side: "left" }),
    }),
    [state.left],
  );

  const rightController: ImageViewerController = useMemo(
    () => ({
      transform: state.right,
      zoomBy: (factor) => dispatch({ type: "zoom", side: "right", factor }),
      panBy: (dx, dy) => dispatch({ type: "pan", side: "right", dx, dy }),
      reset: () => dispatch({ type: "reset", side: "right" }),
      fit: () => dispatch({ type: "fit", side: "right" }),
    }),
    [state.right],
  );

  return { state, dispatch, leftController, rightController };
}
