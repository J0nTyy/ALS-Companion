import { Pencil } from "lucide-react";

import {
  RESEARCH_ASSET_STATUS_META,
  RESEARCH_ASSET_TYPE_META,
  type ResearchAsset,
} from "@/domain/entities/research-asset";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { AssetImagePanel } from "@/presentation/features/storage/asset-image-panel";

/**
 * Read view of one research asset's metadata plus its attached image. The type
 * and lifecycle status show as badges; below the metadata, the {@link
 * AssetImagePanel} lets a researcher attach/view/replace a single image (v1.0).
 */
export function ResearchAssetItem({
  asset,
  onEdit,
  readOnly = false,
  onChanged,
}: {
  asset: ResearchAsset;
  onEdit?: () => void;
  readOnly?: boolean;
  /** Called after an image attach so the parent can refresh the asset (status). */
  onChanged?: () => void;
}) {
  const typeMeta = RESEARCH_ASSET_TYPE_META[asset.assetType];
  const statusMeta = RESEARCH_ASSET_STATUS_META[asset.status];

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="font-medium text-foreground">{asset.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{typeMeta.label}</Badge>
            <Badge variant={statusMeta.tone}>{statusMeta.label}</Badge>
          </div>
        </div>
        {onEdit ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={`Edit ${asset.title}`}
          >
            <Pencil />
            Edit
          </Button>
        ) : null}
      </div>

      {asset.description ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {asset.description}
        </p>
      ) : null}

      <AssetImagePanel
        researchAssetId={asset.id}
        readOnly={readOnly}
        {...(onChanged ? { onChanged } : {})}
      />
    </div>
  );
}
