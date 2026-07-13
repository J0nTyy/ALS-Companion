/**
 * Composition root for the Export & Report Engine (v1.8).
 * ----------------------------------------------------------------------------
 * The pure export engine turns a PublicationPackage into files; the service pairs
 * it with the existing file abstractions (destination picker + write) so exports
 * reuse the same storage boundary as everything else. Safe to import in the browser
 * preview (the Tauri adapters are isTauri-guarded).
 */
import {
  createExportService,
  type ExportService,
} from "@/application/services/export-service";
import { TauriFilePicker } from "@/infrastructure/storage/tauri-file-picker";
import { TauriFileStore } from "@/infrastructure/storage/tauri-file-store";

export const exportService: ExportService = createExportService({
  filePicker: new TauriFilePicker(),
  fileStore: new TauriFileStore(),
});
