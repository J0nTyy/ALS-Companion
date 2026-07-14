import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { check as checkForUpdate, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";

/**
 * The auto-update state machine, shared by the launch check and the Settings
 * "Check for updates" button. Wraps @tauri-apps/plugin-updater (+ plugin-process for
 * the relaunch). All calls are guarded by {@link isTauri} — in the browser preview
 * updates are simply "unavailable".
 */
export type UpdaterState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "uptodate" }
  | { status: "available"; version: string; currentVersion: string; notes: string }
  | { status: "downloading"; version: string; downloaded: number; total: number | null }
  | { status: "installing"; version: string }
  | { status: "error"; message: string }
  | { status: "unavailable" };

interface UpdaterContextValue {
  state: UpdaterState;
  /** Check for an update. `silent` (launch check) fails quietly when offline. */
  check: (opts?: { silent?: boolean }) => Promise<void>;
  /** Download + install the pending update, then relaunch into the new version. */
  install: () => Promise<void>;
  /** Dismiss the current notice (back to idle). */
  dismiss: () => void;
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdaterState>({ status: "idle" });
  const updateRef = useRef<Update | null>(null);

  const check = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isTauri()) {
      if (!opts?.silent) setState({ status: "unavailable" });
      return;
    }
    setState({ status: "checking" });
    try {
      const update = await checkForUpdate();
      if (!update) {
        updateRef.current = null;
        setState({ status: "uptodate" });
        return;
      }
      updateRef.current = update;
      setState({
        status: "available",
        version: update.version,
        currentVersion: update.currentVersion,
        notes: update.body ?? "",
      });
    } catch (error) {
      // A launch check should never nag when the machine is simply offline.
      if (opts?.silent) {
        setState({ status: "idle" });
      } else {
        setState({
          status: "error",
          message: toUserMessage(error, "We couldn't check for updates. Please try again."),
        });
      }
    }
  }, []);

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    setState({ status: "downloading", version: update.version, downloaded: 0, total: null });
    try {
      let total: number | null = null;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? null;
            setState({ status: "downloading", version: update.version, downloaded: 0, total });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setState({ status: "downloading", version: update.version, downloaded, total });
            break;
          case "Finished":
            setState({ status: "installing", version: update.version });
            break;
        }
      });
      // The new version is installed — relaunch into it.
      await relaunch();
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(error, "The update couldn't be installed. Please try again."),
      });
    }
  }, []);

  const dismiss = useCallback(() => setState({ status: "idle" }), []);

  const value = useMemo(
    () => ({ state, check, install, dismiss }),
    [state, check, install, dismiss],
  );

  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpdater(): UpdaterContextValue {
  const context = useContext(UpdaterContext);
  if (!context) {
    throw new Error("useUpdater must be used within an UpdaterProvider");
  }
  return context;
}
