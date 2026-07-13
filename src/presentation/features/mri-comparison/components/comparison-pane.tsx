import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

import type { ComparableSession } from "@/application/ports/mri-comparison-reader";
import type { Annotation } from "@/domain/entities/annotation";
import type { ImageViewerController } from "@/presentation/features/storage/image-transform";
import { AnnotatableImageViewer } from "@/presentation/features/annotations/annotatable-image-viewer";
import { useStorageService } from "@/presentation/features/storage/storage-service-context";
import { comparisonMetadataRows } from "../comparison-selection";

/**
 * One side of the comparison: the chosen session's metadata plus a read-only
 * annotated viewer driven by the shared (sync-aware) controller. Its annotations
 * render on the image; a linked partner in the other pane is highlighted when one
 * is selected. Comparison never edits annotations — there are no drawing tools.
 */
export function ComparisonPane({
  label,
  session,
  controller,
  annotations,
  selectedId,
  highlightedIds,
  linkedIds,
  onSelectAnnotation,
}: {
  label: string;
  session: ComparableSession | null;
  controller: ImageViewerController;
  annotations: readonly Annotation[];
  selectedId: string | null;
  highlightedIds: readonly string[];
  linkedIds: readonly string[];
  onSelectAnnotation: (id: string | null) => void;
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
            <AnnotatableImageViewer
              src={url}
              alt={`${session.animalIdentifier} — ${session.title}`}
              controller={controller}
              annotations={annotations}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              linkedIds={linkedIds}
              mode="select"
              onSelect={onSelectAnnotation}
              onCreate={() => {}}
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
