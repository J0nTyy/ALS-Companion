import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import type { StoredFile } from "@/domain/entities/stored-file";
import type { FilePicker, FileStore } from "@/application/ports/file-storage";
import type {
  ExportFormat,
  ReportImage,
  ReportImages,
  ReportOptions,
} from "@/application/export/export-types";
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
