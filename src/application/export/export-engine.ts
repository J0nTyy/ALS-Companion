/**
 * The Export & Report Engine (v1.8) — the SINGLE output layer. Given an existing
 * {@link PublicationPackage} and a format, it dispatches to the format's exporter
 * (an adapter) and returns the files. It never queries repositories, never writes
 * to disk, and never duplicates publication logic.
 *
 * Future outputs (journal templates, AI reports, supplementary files) should extend
 * this engine by adding a new format + exporter — not a new publication path.
 */
import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import type { ExportBundle, ExportFormat } from "./export-types";
import { jsonExporter } from "./exporters/json-exporter";
import { csvExporter } from "./exporters/csv-exporter";
import { pdfExporter } from "./exporters/pdf-exporter";
import { docxExporter } from "./exporters/docx-exporter";

export function exportPackage(
  pkg: PublicationPackage,
  format: ExportFormat,
): ExportBundle {
  switch (format) {
    case "json":
      return { format, files: jsonExporter(pkg) };
    case "csv":
      return { format, files: csvExporter(pkg) };
    case "pdf":
      return { format, files: pdfExporter(pkg) };
    case "docx":
      return { format, files: docxExporter(pkg) };
  }
}
