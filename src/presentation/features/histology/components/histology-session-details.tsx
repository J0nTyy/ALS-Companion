import { useRef } from "react";
import { Image as ImageIcon, Pencil } from "lucide-react";

import {
  HISTOLOGY_STAIN_META,
  histologySessionLabel,
  type HistologySession,
} from "@/domain/entities/histology-session";
import { Button } from "@/presentation/components/ui/button";
import {
  ConfirmDeleteButton,
  type ConfirmDeleteHandle,
} from "@/presentation/components/confirm-delete-button";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildHistologySessionContextMenu } from "@/presentation/features/context-menu/menus";
import { ResearchAssetsSection } from "@/presentation/features/assets/research-assets-section";
import { formatDateOnly } from "@/shared/lib/format";

/**
 * Read view of one histology session's metadata, plus the honest "no images yet"
 * state and the Research Assets section (which holds this session's images —
 * exactly the same attach/view/annotate stack MRI uses). This milestone stores
 * metadata only.
 */
export function HistologySessionDetails({
  session,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  session: HistologySession;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  readOnly?: boolean;
}) {
  const contextMenu = useContextMenu();
  const deleteRef = useRef<ConfirmDeleteHandle>(null);
  const label = histologySessionLabel(session);
  return (
    <div
      className="rounded-lg border border-border bg-card px-5 py-4"
      onContextMenu={(e) =>
        contextMenu.open(
          e,
          buildHistologySessionContextMenu({
            ...(onEdit ? { onEdit } : {}),
            ...(onDelete ? { onDelete: () => deleteRef.current?.open() } : {}),
          }),
        )
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-foreground">{label}</p>
        {onEdit || onDelete ? (
          <div className="flex items-center gap-1">
            {onEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                aria-label={`Edit ${label}`}
              >
                <Pencil />
                Edit
              </Button>
            ) : null}
            {onDelete ? (
              <ConfirmDeleteButton
                ref={deleteRef}
                iconOnly
                triggerAriaLabel={`Delete ${label}`}
                title="Delete this histology session?"
                description={
                  <>
                    This permanently removes{" "}
                    <span className="font-medium text-foreground">{label}</span>{" "}
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
        <DetailRow label="Stain" value={HISTOLOGY_STAIN_META[session.stain].label} />
        <DetailRow
          label="Tissue"
          value={session.tissue ?? "Not recorded"}
          muted={session.tissue === undefined}
        />
        <DetailRow
          label="Magnification"
          value={session.magnification ?? "Not recorded"}
          muted={session.magnification === undefined}
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
          Add histology images under{" "}
          <span className="font-medium">Research assets</span> below — create an
          asset, then attach a PNG, JPEG, or TIFF.
        </p>
      </div>

      {/* Research assets hold this session's images (attach/view/annotate below). */}
      <ResearchAssetsSection
        ownerType="histology_session"
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
