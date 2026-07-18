import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import type { StoredFile } from "@/domain/entities/stored-file";
import type { FilePicker, FileStore } from "@/application/ports/file-storage";
import type {
  ExportFormat,
  ReportImage,
  ReportImages,
  ReportOptions,
} from "@/application/export/export-types";
import { EXPORT_FORMAT_META } from "@/application/export/export-types";
import { readImageInfo } from "@/application/export/image-info";

/** The result of an export attempt. */
export type ExportOutcome =
  | { status: "done"; directory: string; fileNames: string[] }
  | { status: "cancelled" };

/** Per-export options chosen by the caller (from the researcher's settings). */
export interface ExportOptions {
  /**
   * When true, study images are loaded from managed storage and embedded inline in
   * the PDF and DOCX reports. Ignored for the CSV and JSON formats, which carry no
   * images.
   */
  attachImages?: boolean;
  /** Report layout (page size, cover page, header/footer). PDF + DOCX only. */
  report?: Partial<ReportOptions>;
}

/**
 * Facade the presentation layer uses to export a publication package. It runs the
 * pure {@link exportPackage} engine, prompts for a destination via the FilePicker,
 * and writes the files via the FileStore — reusing the existing file abstractions
 * (never touching Tauri or the filesystem directly). It duplicates no publication
 * logic; the engine is the single output layer.
 */
export interface ExportService {
  export(
    pkg: PublicationPackage,
    format: ExportFormat,
    options?: ExportOptions,
  ): Promise<ExportOutcome>;
}

export interface ExportServiceDeps {
  filePicker: FilePicker;
  fileStore: FileStore;
}

/** Split an absolute path into its directory + final segment (handles \\ and /). */
function splitPath(path: string): { dir: string; name: string } {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index >= 0
    ? { dir: path.slice(0, index), name: path.slice(index + 1) }
    : { dir: "", name: path };
}

/** The image stored-files eligible for embedding/attaching (PNG + JPEG). */
function embeddableImages(pkg: PublicationPackage): StoredFile[] {
  return pkg.storedFiles.filter(
    (f) => f.mimeType === "image/png" || f.mimeType === "image/jpeg",
  );
}

export function createExportService(deps: ExportServiceDeps): ExportService {
  /** Load image bytes (best-effort) so the report can embed them, keyed by path. */
  async function loadImages(pkg: PublicationPackage): Promise<ReportImages> {
    const entries = new Map<string, ReportImage>();
    for (const file of embeddableImages(pkg)) {
      try {
        const bytes = await deps.fileStore.readManagedBytes(file.relativePath);
        const info = readImageInfo(bytes);
        entries.set(file.relativePath, {
          bytes,
          mimeType: file.mimeType,
          width: info.width,
          height: info.height,
        });
      } catch {
        // A missing/unreadable image is not fatal — the report still lists it.
      }
    }
    return entries;
  }

  return {
    async export(pkg, format, options) {
      const attach = options?.attachImages ?? false;

      // PDF + DOCX embed images inline; load their bytes before building the report.
      const embedsImages = format === "pdf" || format === "docx";
      const images = attach && embedsImages ? await loadImages(pkg) : undefined;

      // The export engine pulls in the heavy PDF/DOCX libraries, so it is loaded
      // lazily on first export — keeping them out of the initial app bundle.
      const { exportPackage } = await import("@/application/export/export-engine");
      const bundle = await exportPackage(pkg, format, images, options?.report);

      // A single-file export (PDF, DOCX, JSON) gets a native Save dialog so the
      // researcher can name the file — the generated name is pre-filled, so they can
      // just accept it. A multi-file export (CSV) can't share one filename, so it
      // still picks a destination folder and the files keep their generated names.
      if (bundle.files.length === 1) {
        const [only] = bundle.files;
        if (!only) return { status: "cancelled" };
        const chosen = await deps.filePicker.pickSavePath({
          title: "Choose location and export",
          defaultName: only.name,
          filters: [{ name: EXPORT_FORMAT_META[format].label, extensions: [format] }],
        });
        if (!chosen) return { status: "cancelled" };
        const { dir, name } = splitPath(chosen);
        await deps.fileStore.writeExportFiles(dir, [{ name, bytes: only.bytes }]);
        return { status: "done", directory: dir, fileNames: [name] };
      }

      const directory = await deps.filePicker.pickDirectory(
        "Choose export destination",
      );
      if (!directory) return { status: "cancelled" };
      await deps.fileStore.writeExportFiles(directory, bundle.files);
      return {
        status: "done",
        directory,
        fileNames: bundle.files.map((f) => f.name),
      };
    },
  };
}
