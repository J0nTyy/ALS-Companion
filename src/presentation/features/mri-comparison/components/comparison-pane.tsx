import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

import type { ComparableSession } from "@/application/ports/mri-comparison-reader";
import type { ImageViewerController } from "@/presentation/features/storage/image-transform";
import { ImageViewer } from "@/presentation/features/storage/components/image-viewer";
import { useStorageService } from "@/presentation/features/storage/storage-service-context";
import { comparisonMetadataRows } from "../comparison-selection";

/**
 * One side of the comparison: the chosen session's metadata (so the researcher
 * always knows exactly what they're viewing) plus the controlled image viewer.
 * The image URL is resolved through the existing StorageService (asset protocol) —
 * no file logic is duplicated here.
 */
export function ComparisonPane({
  label,
  session,
  controller,
}: {
  label: string;
  session: ComparableSession | null;
  controller: ImageViewerController;
}) {
  const storage = useStorageService();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    if (!session) return;
    storage
      .resolveImageUrl(session.image.relativePath)
      .then((resolved) => {
        if (active) setUrl(resolved);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [session, storage]);

  return (
    <section
      aria-label={label}
      className="min-w-0 space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      {session ? (
        <>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {comparisonMetadataRows(session).map((row) => (
              <div key={row.label} className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd
                  className={
                    row.muted
                      ? "truncate text-sm italic text-muted-foreground"
                      : "truncate text-sm text-foreground"
                  }
                  title={row.value}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {failed ? (
            <p className="rounded-lg border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              This image couldn't be loaded.
            </p>
          ) : url ? (
            <ImageViewer
              src={url}
              alt={`${session.animalIdentifier} — ${session.title}`}
              controller={controller}
              heightClass="h-[28rem]"
            />
          ) : (
            <p className="rounded-lg border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              Loading image…
            </p>
          )}
        </>
      ) : (
        <div className="flex h-[28rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Choose a session above to compare.
          </p>
        </div>
      )}
    </section>
  );
}
