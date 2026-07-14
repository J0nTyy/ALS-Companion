import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import { buildReportModel } from "../report-model";
import { renderReportToDocx } from "../docx-writer";
import {
  studySlug,
  type ExportFile,
  type ReportImages,
  type ReportOptions,
} from "../export-types";

/**
 * DOCX exporter — one editable Word report built from the shared report model.
 * When `images` are supplied they are embedded inline (the pure writer never reads
 * the filesystem; the service loads the bytes and passes them in).
 */
export async function docxExporter(
  pkg: PublicationPackage,
  images?: ReportImages,
  options?: Partial<ReportOptions>,
): Promise<ExportFile[]> {
  const bytes = await renderReportToDocx(buildReportModel(pkg), images, options);
  return [{ name: `${studySlug(pkg.study.name)}.docx`, bytes }];
}
