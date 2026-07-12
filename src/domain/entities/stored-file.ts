/**
 * Domain entity: StoredFile
 * ----------------------------------------------------------------------------
 * A StoredFile links a {@link ResearchAsset} to an ACTUAL file kept in the app's
 * managed local storage. The database row (and this entity) hold only a **relative
 * path and metadata** — never the image bytes. Framework-free: no React, SQLite,
 * or Tauri.
 *
 * This is the concrete "File Storage" layer of the chain established in v0.8:
 *   MRISession → ResearchAsset (metadata) → StoredFile (this) → Viewer.
 * The `storageType` keeps the storage mechanism abstract: "local_managed" today
 * (a file copied into the app data directory), but a future backend can be added
 * without changing this model or the schema.
 *
 * SCOPE (v1.0): PNG / JPEG / TIFF only, single image per view, no comparison,
 * annotation, measurement, DICOM, or AI.
 */

export const STORAGE_TYPES = ["local_managed"] as const;

export type StorageType = (typeof STORAGE_TYPES)[number];

export interface StoredFile {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The research asset this file is attached to. */
  readonly researchAssetId: string;
  /** Where/how the file is stored (abstract; "local_managed" today). */
  storageType: StorageType;
  /** Path relative to the managed storage root, e.g. "images/<id>.png". */
  relativePath: string;
  /** The file's original name, kept for honest display. */
  originalName: string;
  /** MIME type (one of the supported image types). */
  mimeType: string;
  /** Optional integrity checksum — a placeholder for a future integrity check. */
  checksum?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
}

/** Fields the storage layer needs to record a newly attached file. */
export type NewStoredFileInput = Pick<
  StoredFile,
  "researchAssetId" | "relativePath" | "originalName" | "mimeType"
> &
  Partial<Pick<StoredFile, "storageType" | "checksum">>;

/**
 * A supported image format. `viewableInApp` marks formats the webview can render
 * directly in an `<img>` — TIFF is stored but NOT viewable inline (Chromium has no
 * TIFF decoder and this milestone adds no image processing), so the viewer shows
 * an honest "preview not available yet" message for it.
 */
export interface SupportedImageFormat {
  mime: string;
  label: string;
  extensions: readonly string[];
  viewableInApp: boolean;
}

export const SUPPORTED_IMAGE_FORMATS: readonly SupportedImageFormat[] = [
  { mime: "image/png", label: "PNG", extensions: ["png"], viewableInApp: true },
  {
    mime: "image/jpeg",
    label: "JPEG",
    extensions: ["jpg", "jpeg"],
    viewableInApp: true,
  },
  {
    mime: "image/tiff",
    label: "TIFF",
    extensions: ["tif", "tiff"],
    viewableInApp: false,
  },
];

/** All accepted file extensions (lower-case, no dot), for the file picker filter. */
export const SUPPORTED_IMAGE_EXTENSIONS: readonly string[] =
  SUPPORTED_IMAGE_FORMATS.flatMap((f) => f.extensions);

/** Lower-cased extension of a file name without the dot, or "" if none. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** The supported format for a file name (by extension), or null if unsupported. */
export function imageFormatForFileName(
  name: string,
): SupportedImageFormat | null {
  const ext = fileExtension(name);
  return (
    SUPPORTED_IMAGE_FORMATS.find((f) => f.extensions.includes(ext)) ?? null
  );
}

/** The supported format for a MIME type, or null if unsupported. */
export function imageFormatForMime(mime: string): SupportedImageFormat | null {
  return SUPPORTED_IMAGE_FORMATS.find((f) => f.mime === mime) ?? null;
}

export function isStorageType(value: unknown): value is StorageType {
  return (
    typeof value === "string" &&
    (STORAGE_TYPES as readonly string[]).includes(value)
  );
}
