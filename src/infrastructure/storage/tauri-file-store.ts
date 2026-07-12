import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";

import type { FileStore } from "@/application/ports/file-storage";
import { DesktopRequiredError } from "@/application/errors";
import { isTauri } from "@/infrastructure/platform/environment";

/**
 * {@link FileStore} backed by the app's managed local data directory.
 *
 * Copying is delegated to the narrow custom Rust command `attach_image_file`,
 * which is the ONLY filesystem-write capability exposed to the webview and always
 * writes inside `app_local_data_dir`. Display URLs come from the sandboxed asset
 * protocol (`convertFileSrc`), whose scope is limited to `$APPLOCALDATA` in
 * `tauri.conf.json`. No raw filesystem path ever reaches presentation.
 *
 * Guarded by {@link isTauri}: in the browser preview these operations are
 * unavailable and fail with {@link DesktopRequiredError}.
 */
export class TauriFileStore implements FileStore {
  async save(input: {
    sourcePath: string;
    relativePath: string;
  }): Promise<void> {
    if (!isTauri()) throw new DesktopRequiredError();
    await invoke("attach_image_file", {
      sourcePath: input.sourcePath,
      relativePath: input.relativePath,
    });
  }

  async resolveDisplayUrl(relativePath: string): Promise<string> {
    if (!isTauri()) throw new DesktopRequiredError();
    const base = await appLocalDataDir();
    const absolutePath = await join(base, relativePath);
    return convertFileSrc(absolutePath);
  }
}
