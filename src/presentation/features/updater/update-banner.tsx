import { Download, Loader2, X } from "lucide-react";

import { Button } from "@/presentation/components/ui/button";
import { useUpdater } from "./updater-context";

/**
 * A slim app-wide bar that appears when an update is available (or downloading /
 * installing / failed). Silent launch checks and the "up to date" result show
 * nothing here — those surface in Settings → Updates instead.
 */
export function UpdateBanner() {
  const { state, install, dismiss } = useUpdater();

  if (
    state.status !== "available" &&
    state.status !== "downloading" &&
    state.status !== "installing" &&
    state.status !== "error"
  ) {
    return null;
  }

  const pct =
    state.status === "downloading" && state.total
      ? Math.min(100, Math.round((state.downloaded / state.total) * 100))
      : null;

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm text-foreground">
      {state.status === "available" ? (
        <>
          <Download className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            Version <span className="font-semibold">{state.version}</span> is available
            <span className="text-muted-foreground"> (you have {state.currentVersion})</span>.
          </span>
          <Button size="sm" onClick={() => void install()}>
            Update &amp; restart
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss update notice">
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      {state.status === "downloading" ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            Downloading update {state.version}
            {pct !== null ? ` — ${pct}%` : "…"}
          </span>
        </>
      ) : null}

      {state.status === "installing" ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            Installing update {state.version} — the app will restart…
          </span>
        </>
      ) : null}

      {state.status === "error" ? (
        <>
          <span className="min-w-0 flex-1 truncate text-destructive">{state.message}</span>
          <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
