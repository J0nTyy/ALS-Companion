/**
 * Pure state for the MRI comparison workspace: two image transforms plus the
 * synchronization settings. No React, no DOM — a reducer so synchronization,
 * viewer interactions, and keyboard shortcuts are all unit-testable.
 *
 * Synchronization mirrors the *change* (the zoom factor / pan delta) to the other
 * viewer, so enabling sync makes the viewers move together without ever altering
 * the underlying images.
 */
import {
  IDENTITY_TRANSFORM,
  panTransform,
  zoomTransform,
  type ImageTransform,
} from "@/presentation/features/storage/image-transform";

export type ComparisonSide = "left" | "right";

export interface SyncSettings {
  zoom: boolean;
  pan: boolean;
}

export interface ComparisonState {
  left: ImageTransform;
  right: ImageTransform;
  sync: SyncSettings;
}

export const INITIAL_COMPARISON_STATE: ComparisonState = {
  left: IDENTITY_TRANSFORM,
  right: IDENTITY_TRANSFORM,
  sync: { zoom: false, pan: false },
};

/** Map the "default comparison sync" preference to concrete sync settings. */
export function syncFromDefault(
  mode: "none" | "zoom" | "pan" | "both",
): SyncSettings {
  return {
    zoom: mode === "zoom" || mode === "both",
    pan: mode === "pan" || mode === "both",
  };
}

export type ComparisonAction =
  | { type: "zoom"; side: ComparisonSide; factor: number }
  | { type: "pan"; side: ComparisonSide; dx: number; dy: number }
  | { type: "reset"; side: ComparisonSide }
  | { type: "fit"; side: ComparisonSide }
  | { type: "resetBoth" }
  | { type: "fitBoth" }
  | { type: "toggleSyncZoom" }
  | { type: "toggleSyncPan" }
  | { type: "setSyncBoth"; on: boolean };

const other = (side: ComparisonSide): ComparisonSide =>
  side === "left" ? "right" : "left";

function setSide(
  state: ComparisonState,
  side: ComparisonSide,
  value: ImageTransform,
): ComparisonState {
  return side === "left"
    ? { ...state, left: value }
    : { ...state, right: value };
}

export function comparisonReducer(
  state: ComparisonState,
  action: ComparisonAction,
): ComparisonState {
  switch (action.type) {
    case "zoom": {
      let next = setSide(
        state,
        action.side,
        zoomTransform(state[action.side], action.factor),
      );
      if (state.sync.zoom) {
        const o = other(action.side);
        next = setSide(next, o, zoomTransform(state[o], action.factor));
      }
      return next;
    }
    case "pan": {
      let next = setSide(
        state,
        action.side,
        panTransform(state[action.side], action.dx, action.dy),
      );
      if (state.sync.pan) {
        const o = other(action.side);
        next = setSide(next, o, panTransform(state[o], action.dx, action.dy));
      }
      return next;
    }
    case "reset":
    case "fit": {
      // Resetting/fitting is both a zoom and a pan change, so it mirrors when
      // either sync is on.
      let next = setSide(state, action.side, IDENTITY_TRANSFORM);
      if (state.sync.zoom || state.sync.pan) {
        next = setSide(next, other(action.side), IDENTITY_TRANSFORM);
      }
      return next;
    }
    case "resetBoth":
    case "fitBoth":
      return { ...state, left: IDENTITY_TRANSFORM, right: IDENTITY_TRANSFORM };
    case "toggleSyncZoom":
      return { ...state, sync: { ...state.sync, zoom: !state.sync.zoom } };
    case "toggleSyncPan":
      return { ...state, sync: { ...state.sync, pan: !state.sync.pan } };
    case "setSyncBoth":
      return { ...state, sync: { zoom: action.on, pan: action.on } };
  }
}

/** Whether both sync toggles are on (drives the "Sync both" control). */
export function isSyncBoth(sync: SyncSettings): boolean {
  return sync.zoom && sync.pan;
}

/**
 * Map a keyboard key to a comparison action, or null if it isn't a shortcut:
 * R → reset both, F → fit both, Z → toggle sync zoom, P → toggle sync pan.
 */
export function shortcutAction(key: string): ComparisonAction | null {
  switch (key.toLowerCase()) {
    case "r":
      return { type: "resetBoth" };
    case "f":
      return { type: "fitBoth" };
    case "z":
      return { type: "toggleSyncZoom" };
    case "p":
      return { type: "toggleSyncPan" };
    default:
      return null;
  }
}
