import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import { studySlug, textFile, type ExportFile } from "../export-types";

/**
 * Stable schema version for the JSON export. Bump only for breaking changes — future
 * AI / analysis modules consume this output, so the shape must stay predictable.
 */
export const EXPORT_SCHEMA_VERSION = 1;

/**
 * The complete PublicationPackage as a stable, documented structure. Optional
 * fields that are undefined are omitted by JSON.stringify. Stored files are
 * references (path + metadata), never bytes; measurements are the derived,
 * normalized values (no image pixels in an export context).
 */
export function toJsonDocument(pkg: PublicationPackage): Record<string, unknown> {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    study: pkg.study,
    protocol: pkg.protocol,
    animals: pkg.animals,
    timelineEvents: pkg.timelineEvents,
    observations: pkg.observations,
    mriSessions: pkg.mriSessions,
    histologySessions: pkg.histologySessions,
    biomarkerSamples: pkg.biomarkerSamples,
    biomarkerResults: pkg.biomarkerResults,
    researchAssets: pkg.researchAssets,
    storedFiles: pkg.storedFiles,
    annotations: pkg.annotations,
    measurements: pkg.measurements,
    annotationLinks: pkg.annotationLinks,
  };
}

/** JSON exporter — one pretty-printed file with the whole package. */
export function jsonExporter(pkg: PublicationPackage): ExportFile[] {
  const text = JSON.stringify(toJsonDocument(pkg), null, 2);
  return [textFile(`${studySlug(pkg.study.name)}.json`, `${text}\n`)];
}
