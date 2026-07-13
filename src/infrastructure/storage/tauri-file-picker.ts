import { open } from "@tauri-apps/plugin-dialog";

import type { FilePicker, PickedFile } from "@/application/ports/file-storage";
import { DesktopRequiredError } from "@/application/errors";
import { SUPPORTED_IMAGE_EXTENSIONS } from "@/domain/entities/stored-file";
import { isTauri } from "@/infrastructure/platform/environment";

/** Base name (last path segment) of a Windows or POSIX path. */
function baseName(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

/**
 * {@link FilePicker} backed by the Tauri dialog plugin (`dialog:allow-open`). It
 * only ever returns the path the user explicitly chose — it never reads or lists
 * the filesystem itself. Guarded by {@link isTauri} for the browser preview.
 */
export class TauriFilePicker implements FilePicker {
  async pickImage(): Promise<PickedFile | null> {
    if (!isTauri()) throw new DesktopRequiredError();

    const selected: unknown = await open({
      multiple: false,
      directory: false,
      title: "Choose an image",
      filters: [
        { name: "Images", extensions: [...SUPPORTED_IMAGE_EXTENSIONS] },
      ],
    });

    // Normalize across plugin-dialog return shapes (string, {path}, or array).
    const path =
      typeof selected === "string"
        ? selected
        : Array.isArray(selected) && typeof selected[0] === "string"
          ? selected[0]
          : selected && typeof (selected as { path?: unknown }).path === "string"
            ? (selected as { path: string }).path
            : null;

    if (!path) return null;
    return { path, name: baseName(path) };
  }

  async pickDirectory(title = "Choose export destination"): Promise<string | null> {
    if (!isTauri()) throw new DesktopRequiredError();

    const selected: unknown = await open({
      multiple: false,
      directory: true,
      title,
    });

    const path =
      typeof selected === "string"
        ? selected
        : Array.isArray(selected) && typeof selected[0] === "string"
          ? selected[0]
          : selected && typeof (selected as { path?: unknown }).path === "string"
            ? (selected as { path: string }).path
            : null;

    return path;
  }
}
