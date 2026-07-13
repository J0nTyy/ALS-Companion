import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import { buildReportModel } from "../report-model";
import { renderReportToDocx } from "../docx-writer";
import { studySlug, type ExportFile } from "../export-types";

/** DOCX exporter — one editable Word report built from the shared report model. */
export function docxExporter(pkg: PublicationPackage): ExportFile[] {
  const bytes = renderReportToDocx(buildReportModel(pkg));
  return [{ name: `${studySlug(pkg.study.name)}.docx`, bytes }];
}
