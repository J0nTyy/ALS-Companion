import { useRef } from "react";
import { Image as ImageIcon, Pencil } from "lucide-react";

import {
  MRI_MODALITY_META,
  type MRISession,
} from "@/domain/entities/mri-session";
import { Button } from "@/presentation/components/ui/button";
import {
  ConfirmDeleteButton,
  type ConfirmDeleteHandle,
} from "@/presentation/components/confirm-delete-button";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildMriSessionContextMenu } from "@/presentation/features/context-menu/menus";
import { ResearchAssetsSection } from "@/presentation/features/assets/research-assets-section";
import { formatDateOnly } from "@/shared/lib/format";

/**
 * Read view of one MRI session's metadata, plus the honest "no images yet" state
 * and the Research Assets section (metadata for the files this session will hold).
 * Image upload, viewer, annotations, ROI, and AI are future subsystems — this
 * milestone stores metadata only.
 */
export function MriSessionDetails({
  session,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  session: MRISession;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  readOnly?: boolean;
}) {
  const contextMenu = useContextMenu();
  const deleteRef = useRef<ConfirmDeleteHandle>(null);
  return (
    <div
      className="rounded-lg border border-border bg-card px-5 py-4"
      onContextMenu={(e) =>
        contextMenu.open(
          e,
          buildMriSessionContextMenu({
            ...(onEdit ? { onEdit } : {}),
            ...(onDelete ? { onDelete: () => deleteRef.current?.open() } : {}),
          }),
        )
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-foreground">{session.title}</p>
        {onEdit || onDelete ? (
          <div className="flex items-center gap-1">
            {onEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                aria-label={`Edit ${session.title}`}
              >
                <Pencil />
                Edit
              </Button>
            ) : null}
            {onDelete ? (
              <ConfirmDeleteButton
                ref={deleteRef}
                iconOnly
                triggerAriaLabel={`Delete ${session.title}`}
                title="Delete this MRI session?"
                description={
                  <>
                    This permanently removes{" "}
                    <span className="font-medium text-foreground">
                      {session.title}
                    </span>{" "}
                    and all of its research assets and attached image files. This
                    action cannot be undone.
                  </>
                }
                onConfirm={onDelete}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <DetailRow
          label="Acquisition date"
          value={formatDateOnly(session.acquisitionDate)}
        />
        <DetailRow label="Modality" value={MRI_MODALITY_META[session.modality].label} />
        <DetailRow
          label="Region"
          value={session.anatomicalRegion ?? "Not recorded"}
          muted={session.anatomicalRegion === undefined}
        />
        <DetailRow
          label="Operator"
          value={session.operator ?? "Not recorded"}
          muted={session.operator === undefined}
        />
      </dl>

      {session.notes ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </p>
          <p className="mt-0.5 text-sm text-foreground">{session.notes}</p>
        </div>
      ) : null}

      {/* Images attach to research assets (below), not to the session directly. */}
      <div className="mt-4 flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
        <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Add MRI images under <span className="font-medium">Research assets</span>{" "}
          below — create an asset, then attach a PNG, JPEG, or TIFF.
        </p>
      </div>

      {/* Research assets hold this session's images (attach/view below). */}
      <ResearchAssetsSection
        ownerType="mri_session"
        ownerId={session.id}
        readOnly={readOnly}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          muted
            ? "text-sm italic text-muted-foreground"
            : "text-sm text-foreground"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}
