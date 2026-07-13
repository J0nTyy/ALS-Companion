import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import type { FilePicker, FileStore } from "@/application/ports/file-storage";
import { exportPackage } from "@/application/export/export-engine";
import type { ExportFormat } from "@/application/export/export-types";

/** The result of an export attempt. */
export type ExportOutcome =
  | { status: "done"; directory: string; fileNames: string[] }
  | { status: "cancelled" };

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
  ): Promise<ExportOutcome>;
}

export interface ExportServiceDeps {
  filePicker: FilePicker;
  fileStore: FileStore;
}

export function createExportService(deps: ExportServiceDeps): ExportService {
  return {
    async export(pkg, format) {
      const bundle = exportPackage(pkg, format);
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
