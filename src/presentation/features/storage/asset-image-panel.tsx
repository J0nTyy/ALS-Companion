import { useState } from "react";
import { ImagePlus, Loader2, RefreshCw } from "lucide-react";

import { imageFormatForMime } from "@/domain/entities/stored-file";
import { Button } from "@/presentation/components/ui/button";
import { toUserMessage } from "@/presentation/lib/error-message";
import { formatDate } from "@/shared/lib/format";
import { AnnotationWorkspace } from "@/presentation/features/annotations/annotation-workspace";
import { useAssetImage } from "./use-asset-image";
import { useStorageService } from "./storage-service-context";

/**
 * The image area inside one research asset: attach / view / replace a single
 * image, with the filename, type, and attached date. PNG/JPEG render in the
 * viewer; TIFF is stored but shown with an honest "preview not available yet"
 * note (the webview has no TIFF decoder and this milestone adds no image
 * processing). Attaching is hidden when the study is read-only (archived).
 */
export function AssetImagePanel({
  researchAssetId,
  readOnly,
  onChanged,
}: {
  researchAssetId: string;
  readOnly: boolean;
  onChanged?: () => void;
}) {
  const service = useStorageService();
  const { state, reload } = useAssetImage(researchAssetId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAttach() {
    setBusy(true);
    setActionError(null);
    try {
      const file = await service.attachImage(researchAssetId);
      if (file) {
        await reload();
        onChanged?.();
      }
      // A null result means the picker was cancelled — nothing to do.
    } catch (error) {
      setActionError(
        toUserMessage(
          error,
          "We couldn't attach that image. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  const attachButton = (label: string, icon: React.ReactNode) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleAttach}
      disabled={busy}
    >
      {busy ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </Button>
  );

  return (
    <div className="mt-3 border-t border-border pt-3">
      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Attaching and viewing images is available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading image…</p>
      ) : null}

      {state.status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === "empty" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            No image attached yet.
          </p>
          {readOnly ? null : attachButton("Attach image", <ImagePlus />)}
        </div>
      ) : null}

      {state.status === "ready" ? (
        <div className="space-y-3">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3">
            <Meta label="File" value={state.file.originalName} />
            <Meta
              label="Type"
              value={
                imageFormatForMime(state.file.mimeType)?.label ??
                state.file.mimeType
              }
            />
            <Meta label="Attached" value={formatDate(state.file.createdAt)} />
          </dl>

          {state.viewable && state.url ? (
            <AnnotationWorkspace
              storedFileId={state.file.id}
              src={state.url}
              alt={state.file.originalName}
              readOnly={readOnly}
            />
          ) : (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              This {imageFormatForMime(state.file.mimeType)?.label ?? "image"}{" "}
              is stored, but an in-app preview isn't available yet. Side-by-side
              comparison and other formats arrive in a later version.
            </p>
          )}

          {readOnly ? null : (
            <div>{attachButton("Replace image", <RefreshCw />)}</div>
          )}
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-2 text-sm text-destructive">{actionError}</p>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-sm text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}
