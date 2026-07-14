import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import { buildReportModel } from "../report-model";
import { renderReportToPdf } from "../pdf-writer";
import {
  studySlug,
  type ExportFile,
  type ReportImages,
  type ReportOptions,
} from "../export-types";

/**
 * PDF exporter — one professional report built from the shared report model, with
 * images embedded inline (via pdf-lib) when their bytes are supplied.
 */
export async function pdfExporter(
  pkg: PublicationPackage,
  images?: ReportImages,
  options?: Partial<ReportOptions>,
): Promise<ExportFile[]> {
  const bytes = await renderReportToPdf(buildReportModel(pkg), images, options);
  return [{ name: `${studySlug(pkg.study.name)}.pdf`, bytes }];
}
