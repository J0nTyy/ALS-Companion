import { useCallback, useEffect, useState } from "react";

import type { StoredFile } from "@/domain/entities/stored-file";
import { imageFormatForMime } from "@/domain/entities/stored-file";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useStorageService } from "./storage-service-context";

export type AssetImageState =
  | { status: "unavailable" } // browser preview — no database/filesystem
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" } // no image attached yet
  | {
      status: "ready";
      file: StoredFile;
      /** Whether this format can be shown inline (PNG/JPEG yes, TIFF no). */
      viewable: boolean;
      /** The asset-protocol URL to load, present only when viewable. */
      url?: string;
    };

/**
 * Loads the current (most recent) image attached to a research asset and, when
 * the format is viewable in the webview (PNG/JPEG), resolves its display URL. In
 * the browser preview it never touches the database/filesystem ("unavailable").
 */
export function useAssetImage(researchAssetId: string) {
  const service = useStorageService();
  const [state, setState] = useState<AssetImageState>(() =>
    isTauri() ? { status: "loading" } : { status: "unavailable" },
  );

  const reload = useCallback(async () => {
    if (!isTauri()) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "loading" });
    try {
      const file = await service.getLatestFile(researchAssetId);
      if (!file) {
        setState({ status: "empty" });
        return;
      }
      const viewable = imageFormatForMime(file.mimeType)?.viewableInApp ?? false;
      if (!viewable) {
        setState({ status: "ready", file, viewable: false });
        return;
      }
      const url = await service.resolveImageUrl(file.relativePath);
      setState({ status: "ready", file, viewable: true, url });
    } catch (error) {
      setState({
        status: "error",
        message: toUserMessage(
          error,
          "We couldn't open the image. Please try again.",
        ),
      });
    }
  }, [service, researchAssetId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}
