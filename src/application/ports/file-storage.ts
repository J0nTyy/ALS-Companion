/**
 * Ports for the actual file-storage mechanism, kept behind interfaces so the
 * application never touches the filesystem directly and presentation never sees
 * raw paths or Tauri APIs. Concrete adapters live in `infrastructure`.
 */

/** The byte-level store: copies files in and resolves them to loadable URLs. */
export interface FileStore {
  /**
   * Copy an external source file into managed storage at `relativePath` (relative
   * to the managed root). The destination is always inside the app's own data
   * directory — implementations must never write elsewhere.
   */
  save(input: { sourcePath: string; relativePath: string }): Promise<void>;

  /**
   * Resolve a stored relative path to a URL the webview can load in an `<img>`
   * (via the sandboxed asset protocol). Never returns a raw filesystem path.
   */
  resolveDisplayUrl(relativePath: string): Promise<string>;

  /**
   * Best-effort removal of managed files by relative path (v1.4) — called after
   * their database rows are deleted. Missing files are not an error.
   */
  remove(relativePaths: readonly string[]): Promise<void>;

  /**
   * Write export files into a user-chosen destination directory (v1.8). Unlike
   * {@link save}, this writes OUTSIDE the managed storage — the whole point of an
   * export — but only into the directory the user picked, with plain filenames.
   */
  writeExportFiles(
    directory: string,
    files: readonly { name: string; bytes: Uint8Array }[],
  ): Promise<void>;
}

/** A file the user chose in the OS picker. */
export interface PickedFile {
  /** Absolute path to the chosen file (used only by the storage layer). */
  path: string;
  /** The file's base name — for display and extension/MIME detection. */
  name: string;
}

/** The OS file picker, behind a port so the application can prompt for a file. */
export interface FilePicker {
  /** Open the image picker; resolves to the chosen file, or null if cancelled. */
  pickImage(): Promise<PickedFile | null>;

  /**
   * Prompt for a destination directory (for exports); resolves to its absolute
   * path, or null if cancelled.
   */
  pickDirectory(title?: string): Promise<string | null>;
}
