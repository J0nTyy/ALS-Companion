import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import { buildReportModel } from "../report-model";
import { renderReportToPdf } from "../pdf-writer";
import { studySlug, type ExportFile } from "../export-types";

/** PDF exporter — one professional report built from the shared report model. */
export function pdfExporter(pkg: PublicationPackage): ExportFile[] {
  const bytes = renderReportToPdf(buildReportModel(pkg));
  return [{ name: `${studySlug(pkg.study.name)}.pdf`, bytes }];
}
