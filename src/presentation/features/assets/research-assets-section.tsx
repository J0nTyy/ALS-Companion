import { useState } from "react";
import { FileStack, Plus } from "lucide-react";

import type {
  ResearchAsset,
  ResearchAssetOwnerType,
} from "@/domain/entities/research-asset";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import {
  ResearchAssetForm,
  type ResearchAssetFormValues,
} from "./components/research-asset-form";
import { ResearchAssetItem } from "./components/research-asset-item";
import { useResearchAssets } from "./use-research-assets";
import { useResearchAssetService } from "./research-asset-service-context";
import { useDeletionService } from "@/presentation/features/deletion/deletion-service-context";

type SectionMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; asset: ResearchAsset };

/**
 * The Research Assets section shown inside an owner (today, an MRI session).
 *
 * A research asset is metadata describing a scientific file. This section lets a
 * researcher create/edit that metadata and list what has been recorded. Each
 * listed asset also shows its image panel (attach/view/replace a PNG/JPEG/TIFF —
 * v1.0). Archived studies are read-only.
 */
export function ResearchAssetsSection({
  ownerType,
  ownerId,
  readOnly = false,
}: {
  ownerType: ResearchAssetOwnerType;
  ownerId: string;
  readOnly?: boolean;
}) {
  const service = useResearchAssetService();
  const deletion = useDeletionService();
  const { state, reload } = useResearchAssets(ownerType, ownerId);
  const [mode, setMode] = useState<SectionMode>({ kind: "list" });

  const effectiveMode: SectionMode = readOnly ? { kind: "list" } : mode;

  async function handleCreate(values: ResearchAssetFormValues) {
    await service.create({
      ownerType,
      ownerId,
      assetType: values.assetType,
      title: values.title,
      status: values.status,
      description: values.description,
    });
    setMode({ kind: "list" });
    await reload();
  }

  async function handleUpdate(id: string, values: ResearchAssetFormValues) {
    await service.update({
      id,
      assetType: values.assetType,
      title: values.title,
      status: values.status,
      description: values.description,
    });
    setMode({ kind: "list" });
    await reload();
  }

  const addButton = (
    <Button size="sm" variant="outline" onClick={() => setMode({ kind: "create" })}>
      <Plus />
      Add research asset
    </Button>
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <FileStack className="h-4 w-4 text-primary" />
        Research assets
      </div>

      {state.status === "unavailable" ? (
        <p className="text-sm text-muted-foreground">
          Research assets are available in the installed desktop app.
        </p>
      ) : null}

      {state.status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading research assets…</p>
      ) : null}

      {state.status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "create" ? (
        <Card>
          <CardContent className="pt-6">
            <ResearchAssetForm
              submitLabel="Save asset"
              onSubmit={handleCreate}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "edit" ? (
        <Card>
          <CardContent className="pt-6">
            <ResearchAssetForm
              initialValues={{
                assetType: effectiveMode.asset.assetType,
                title: effectiveMode.asset.title,
                ...(effectiveMode.asset.status === "attached"
                  ? {}
                  : { status: effectiveMode.asset.status }),
                ...(effectiveMode.asset.description !== undefined
                  ? { description: effectiveMode.asset.description }
                  : {}),
              }}
              submitLabel="Save changes"
              onSubmit={(values) => handleUpdate(effectiveMode.asset.id, values)}
              onCancel={() => setMode({ kind: "list" })}
            />
          </CardContent>
        </Card>
      ) : null}

      {state.status === "ready" && effectiveMode.kind === "list" ? (
        state.assets.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              No research assets recorded yet. Add one, then you can attach an
              image (PNG, JPEG, or TIFF) to it.
            </p>
            {readOnly ? null : addButton}
          </div>
        ) : (
          <div className="space-y-2">
            {state.assets.map((asset) => (
              <ResearchAssetItem
                key={asset.id}
                asset={asset}
                readOnly={readOnly}
                onChanged={() => void reload()}
                {...(readOnly
                  ? {}
                  : {
                      onEdit: () => setMode({ kind: "edit", asset }),
                      onDelete: async () => {
                        await deletion.deleteResearchAsset(asset.id);
                        await reload();
                      },
                    })}
              />
            ))}
            {readOnly ? null : <div>{addButton}</div>}
          </div>
        )
      ) : null}
    </div>
  );
}
